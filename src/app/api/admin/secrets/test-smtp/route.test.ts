import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  testSmtpConnection: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/secrets", () => ({ testSmtpConnection: h.testSmtpConnection }));

import { POST } from "./route";

function makeReq({
  method = "POST",
  url = "http://localhost/api/admin/secrets/test-smtp",
  body,
  headers = {},
}: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
} = {}) {
  return {
    method,
    url,
    headers: new Headers(headers),
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as any;
}

const ADMIN_TOKEN = { sub: "u1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };

const VALID_SMTP = {
  host: "smtp.example.com",
  port: 587,
  user: "user@example.com",
  password: "pw",
  secure: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
});

describe("POST /api/admin/secrets/test-smtp", () => {
  it("returns success result + audits success", async () => {
    h.testSmtpConnection.mockResolvedValue({ ok: true, message: "Connected" });
    const res = await POST(
      makeReq({ body: VALID_SMTP, headers: { "x-forwarded-for": "5.5.5.5", "user-agent": "ua" } }),
      {}
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "smtp.test.success", ip: "5.5.5.5" })
    );
  });

  it("audits failure when connection fails", async () => {
    h.testSmtpConnection.mockResolvedValue({ ok: false, message: "Auth failed" });
    const res = await POST(makeReq({ body: VALID_SMTP }), {});
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(false);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "smtp.test.failure", ip: null })
    );
  });

  it("returns 400 on validation failure", async () => {
    const res = await POST(makeReq({ body: { host: "", port: 70000, user: "", password: "" } }), {});
    expect(res.status).toBe(400);
    expect(h.testSmtpConnection).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON", async () => {
    const req = makeReq({});
    req.text = async () => "{not json";
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 403 for EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await POST(makeReq({ body: VALID_SMTP }), {});
    expect(res.status).toBe(403);
  });

  it("returns 401 when no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await POST(makeReq({ body: VALID_SMTP }), {});
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 4 });
    const res = await POST(makeReq({ body: VALID_SMTP }), {});
    expect(res.status).toBe(429);
  });

  it("returns 500 when testSmtpConnection throws", async () => {
    h.testSmtpConnection.mockRejectedValue(new Error("boom"));
    const res = await POST(makeReq({ body: VALID_SMTP }), {});
    expect(res.status).toBe(500);
  });
});

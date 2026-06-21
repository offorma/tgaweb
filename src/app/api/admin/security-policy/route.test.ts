import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  securityPolicy: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
  user: { updateMany: vi.fn() },
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/db", () => ({
  db: { securityPolicy: h.securityPolicy, user: h.user },
}));

import { GET, PUT } from "./route";

function makeReq({
  method = "GET",
  url = "http://localhost/api/admin/security-policy",
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

const VALID_POLICY = {
  enforceTwoFactorForAdmins: true,
  enforceTwoFactorForEditors: true,
  minPasswordLength: 12,
  sessionTimeoutHours: 8,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
});

describe("GET /api/admin/security-policy", () => {
  it("returns existing policy", async () => {
    h.securityPolicy.findUnique.mockResolvedValue({ id: "singleton", minPasswordLength: 10 });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(200);
    expect((await res.json()).policy.minPasswordLength).toBe(10);
    expect(h.securityPolicy.create).not.toHaveBeenCalled();
  });

  it("creates default policy when none exists", async () => {
    h.securityPolicy.findUnique.mockResolvedValue(null);
    h.securityPolicy.create.mockResolvedValue({ id: "singleton", minPasswordLength: 12 });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(200);
    expect(h.securityPolicy.create).toHaveBeenCalled();
  });

  it("returns 403 for EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(403);
  });

  it("returns 401 when no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 3 });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(429);
  });
});

describe("PUT /api/admin/security-policy", () => {
  it("upserts, flags admins + editors for 2FA, audits", async () => {
    h.securityPolicy.upsert.mockResolvedValue({ id: "singleton", ...VALID_POLICY });
    h.user.updateMany.mockResolvedValue({ count: 2 });
    const body = { ...VALID_POLICY, id: "x", createdAt: "c", updatedAt: "u" };
    const res = await PUT(makeReq({ method: "PUT", body }), {});
    expect(res.status).toBe(200);
    expect(h.user.updateMany).toHaveBeenCalledTimes(2);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "security-policy.update" })
    );
  });

  it("does not flag users when both enforcement flags are off", async () => {
    h.securityPolicy.upsert.mockResolvedValue({ id: "singleton" });
    const body = {
      enforceTwoFactorForAdmins: false,
      enforceTwoFactorForEditors: false,
      minPasswordLength: 12,
      sessionTimeoutHours: 8,
    };
    const res = await PUT(makeReq({ method: "PUT", body }), {});
    expect(res.status).toBe(200);
    expect(h.user.updateMany).not.toHaveBeenCalled();
  });

  it("returns 400 on validation failure", async () => {
    const res = await PUT(makeReq({ method: "PUT", body: { minPasswordLength: 2 } }), {});
    expect(res.status).toBe(400);
    expect(h.securityPolicy.upsert).not.toHaveBeenCalled();
  });

  it("returns 403 for EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await PUT(makeReq({ method: "PUT", body: VALID_POLICY }), {});
    expect(res.status).toBe(403);
  });

  it("returns 500 when DB throws", async () => {
    h.securityPolicy.upsert.mockRejectedValue(new Error("db down"));
    const res = await PUT(makeReq({ method: "PUT", body: VALID_POLICY }), {});
    expect(res.status).toBe(500);
  });
});

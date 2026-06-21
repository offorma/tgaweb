import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  decryptSecret: vi.fn(),
  secret: { findUnique: vi.fn() },
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/secrets", () => ({ decryptSecret: h.decryptSecret }));
vi.mock("@/lib/db", () => ({ db: { secret: h.secret } }));

import { POST } from "./route";

const VALID_ID = "abcdefghij0123456789klmn";

function makeReq({
  method = "POST",
  url = "http://localhost/api/admin/secrets/" + VALID_ID + "/reveal",
  headers = {},
}: { method?: string; url?: string; headers?: Record<string, string> } = {}) {
  return { method, url, headers: new Headers(headers), text: async () => "" } as any;
}

const ADMIN_TOKEN = { sub: "u1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };
const SECRET_ROW = { id: VALID_ID, key: "SMTP_PASSWORD", ciphertext: "CIPHER" };

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/admin/secrets/[id]/reveal", () => {
  it("returns decrypted value, audits (no x-forwarded-for => ip null)", async () => {
    h.secret.findUnique.mockResolvedValue(SECRET_ROW);
    h.decryptSecret.mockReturnValue("plaintext-value");
    const res = await POST(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
    expect((await res.json()).value).toBe("plaintext-value");
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "secret.reveal", ip: null })
    );
  });

  it("returns 400 on invalid id", async () => {
    const res = await POST(makeReq(), { params: { id: "bad" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 when not found", async () => {
    h.secret.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(404);
  });

  it("returns 500 when decrypt fails (master key rotated)", async () => {
    h.secret.findUnique.mockResolvedValue(SECRET_ROW);
    h.decryptSecret.mockImplementation(() => {
      throw new Error("bad key");
    });
    const res = await POST(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/master key/i);
    // The reveal-specific audit log is NOT written when decryption fails
    expect(h.writeAuditLog).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "secret.reveal" })
    );
  });

  it("returns 403 for EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await POST(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(403);
  });

  it("returns 401 when no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 7 });
    const res = await POST(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(429);
  });
});

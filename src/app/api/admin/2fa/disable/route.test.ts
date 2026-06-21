import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  verifyPassword: vi.fn(),
  verifyTwoFactorToken: vi.fn(),
  decryptTwoFactorSecret: vi.fn(() => "decrypted-secret"),
  decryptBackupCodes: vi.fn(() => ["h1", "h2"]),
  verifyBackupCode: vi.fn(),
  encryptBackupCodes: vi.fn(() => "re-enc"),
  user: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog, verifyPassword: h.verifyPassword }));
vi.mock("@/lib/two-factor", () => ({
  verifyTwoFactorToken: h.verifyTwoFactorToken,
  decryptTwoFactorSecret: h.decryptTwoFactorSecret,
  decryptBackupCodes: h.decryptBackupCodes,
  verifyBackupCode: h.verifyBackupCode,
  encryptBackupCodes: h.encryptBackupCodes,
}));
vi.mock("@/lib/db", () => ({ db: { user: h.user } }));

import { POST } from "./route";

const ADMIN_TOKEN = { sub: "u1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };

const ENABLED_USER = {
  id: "u1",
  passwordHash: "ph",
  twoFactorEnabled: true,
  twoFactorSecret: "enc-secret",
  twoFactorBackupCodes: "enc-codes",
};

function makeReq({ body, headers = {} }: { body?: unknown; headers?: Record<string, string> } = {}) {
  return {
    method: "POST",
    url: "http://localhost/api/admin/2fa/disable",
    headers: new Headers(headers),
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
  h.verifyPassword.mockResolvedValue(true);
  h.verifyTwoFactorToken.mockReturnValue(true);
  h.decryptTwoFactorSecret.mockReturnValue("decrypted-secret");
  h.decryptBackupCodes.mockReturnValue(["h1", "h2"]);
  h.verifyBackupCode.mockReturnValue(-1);
  h.encryptBackupCodes.mockReturnValue("re-enc");
});

describe("POST /api/admin/2fa/disable", () => {
  it("401 when no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await POST(makeReq({ body: { password: "p", totp: "123456" } }), {});
    expect(res.status).toBe(401);
  });

  it("403 when EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await POST(makeReq({ body: { password: "p", totp: "123456" } }), {});
    expect(res.status).toBe(403);
  });

  it("400 on validation failure (missing password)", async () => {
    const res = await POST(makeReq({ body: { totp: "123456" } }), {});
    expect(res.status).toBe(400);
  });

  it("404 when user not found", async () => {
    h.user.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ body: { password: "p", totp: "123456" } }), {});
    expect(res.status).toBe(404);
  });

  it("400 when 2FA not enabled", async () => {
    h.user.findUnique.mockResolvedValue({ ...ENABLED_USER, twoFactorEnabled: false });
    const res = await POST(makeReq({ body: { password: "p", totp: "123456" } }), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("not enabled");
  });

  it("400 when password incorrect", async () => {
    h.user.findUnique.mockResolvedValue(ENABLED_USER);
    h.verifyPassword.mockResolvedValue(false);
    const res = await POST(makeReq({ body: { password: "wrong", totp: "123456" } }), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("password is incorrect");
  });

  it("400 when no totp provided", async () => {
    h.user.findUnique.mockResolvedValue(ENABLED_USER);
    const res = await POST(makeReq({ body: { password: "p" } }), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("2FA code is required");
  });

  it("200 disables via valid TOTP, updates + audits", async () => {
    h.user.findUnique.mockResolvedValue(ENABLED_USER);
    h.verifyTwoFactorToken.mockReturnValue(true);
    h.user.update.mockResolvedValue({ id: "u1" });
    const res = await POST(makeReq({ body: { password: "p", totp: "123456" }, headers: { "x-forwarded-for": "5.5.5.5" } }), {});
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(h.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ twoFactorEnabled: false, twoFactorSecret: null }) })
    );
    expect(h.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "2fa.disabled", ip: "5.5.5.5" }));
  });

  it("200 disables via valid backup code, removes used code", async () => {
    h.user.findUnique.mockResolvedValue(ENABLED_USER);
    h.verifyTwoFactorToken.mockReturnValue(false); // TOTP fails
    h.verifyBackupCode.mockReturnValue(0); // backup code matches index 0
    h.user.update.mockResolvedValue({ id: "u1" });
    const res = await POST(makeReq({ body: { password: "p", totp: "AAAA-BBBB" } }), {});
    expect(res.status).toBe(200);
    // first update removes the used backup code, second disables
    expect(h.encryptBackupCodes).toHaveBeenCalledWith(["h2"]);
    expect(h.user.update).toHaveBeenCalledTimes(2);
  });

  it("400 when both TOTP and backup code fail", async () => {
    h.user.findUnique.mockResolvedValue(ENABLED_USER);
    h.verifyTwoFactorToken.mockReturnValue(false);
    h.verifyBackupCode.mockReturnValue(-1);
    const res = await POST(makeReq({ body: { password: "p", totp: "999999" } }), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Invalid 2FA code");
  });

  it("handles TOTP decrypt error then falls to backup path", async () => {
    h.user.findUnique.mockResolvedValue(ENABLED_USER);
    h.decryptTwoFactorSecret.mockImplementation(() => { throw new Error("decrypt fail"); });
    h.verifyBackupCode.mockReturnValue(1);
    h.user.update.mockResolvedValue({ id: "u1" });
    const res = await POST(makeReq({ body: { password: "p", totp: "AAAA-BBBB" } }), {});
    expect(res.status).toBe(200);
  });

  it("handles backup decrypt error -> 400 invalid", async () => {
    h.user.findUnique.mockResolvedValue(ENABLED_USER);
    h.verifyTwoFactorToken.mockReturnValue(false);
    h.decryptBackupCodes.mockImplementation(() => { throw new Error("bad"); });
    const res = await POST(makeReq({ body: { password: "p", totp: "AAAA-BBBB" } }), {});
    expect(res.status).toBe(400);
  });

  it("500 when final update throws", async () => {
    h.user.findUnique.mockResolvedValue(ENABLED_USER);
    h.verifyTwoFactorToken.mockReturnValue(true);
    h.user.update.mockRejectedValue(new Error("db down"));
    const res = await POST(makeReq({ body: { password: "p", totp: "123456" } }), {});
    expect(res.status).toBe(500);
  });
});

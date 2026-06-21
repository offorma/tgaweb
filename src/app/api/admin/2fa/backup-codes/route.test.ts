import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  verifyPassword: vi.fn(),
  verifyTwoFactorToken: vi.fn(),
  decryptTwoFactorSecret: vi.fn(() => "decrypted-secret"),
  generateBackupCodes: vi.fn(() => ({ plaintext: ["NEW1-CODE"], hashed: ["nh1"] })),
  encryptBackupCodes: vi.fn(() => "enc-new"),
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
  generateBackupCodes: h.generateBackupCodes,
  encryptBackupCodes: h.encryptBackupCodes,
}));
vi.mock("@/lib/db", () => ({ db: { user: h.user } }));

import { POST } from "./route";

const ADMIN_TOKEN = { sub: "u1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };

const ENABLED_USER = { id: "u1", passwordHash: "ph", twoFactorEnabled: true, twoFactorSecret: "enc-secret" };

function makeReq({ body, headers = {} }: { body?: unknown; headers?: Record<string, string> } = {}) {
  return {
    method: "POST",
    url: "http://localhost/api/admin/2fa/backup-codes",
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
  h.generateBackupCodes.mockReturnValue({ plaintext: ["NEW1-CODE"], hashed: ["nh1"] });
  h.encryptBackupCodes.mockReturnValue("enc-new");
});

describe("POST /api/admin/2fa/backup-codes", () => {
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

  it("400 on validation failure (bad totp format)", async () => {
    const res = await POST(makeReq({ body: { password: "p", totp: "abc" } }), {});
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
    expect((await res.json()).error).toContain("TOTP code is required");
  });

  it("500 when secret decryption fails", async () => {
    h.user.findUnique.mockResolvedValue(ENABLED_USER);
    h.decryptTwoFactorSecret.mockImplementation(() => { throw new Error("decrypt fail"); });
    const res = await POST(makeReq({ body: { password: "p", totp: "123456" } }), {});
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("decrypt");
  });

  it("400 when TOTP invalid", async () => {
    h.user.findUnique.mockResolvedValue(ENABLED_USER);
    h.verifyTwoFactorToken.mockReturnValue(false);
    const res = await POST(makeReq({ body: { password: "p", totp: "000000" } }), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Invalid TOTP");
  });

  it("200 regenerates backup codes, updates + audits", async () => {
    h.user.findUnique.mockResolvedValue(ENABLED_USER);
    h.user.update.mockResolvedValue({ id: "u1" });
    const res = await POST(makeReq({ body: { password: "p", totp: "123456" }, headers: { "x-forwarded-for": "3.3.3.3" } }), {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.backupCodes).toEqual(["NEW1-CODE"]);
    expect(h.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { twoFactorBackupCodes: "enc-new" } });
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "2fa.backup-codes.regenerated", ip: "3.3.3.3" })
    );
  });

  it("200 with null ip when no x-forwarded-for header", async () => {
    h.user.findUnique.mockResolvedValue(ENABLED_USER);
    h.user.update.mockResolvedValue({ id: "u1" });
    const res = await POST(makeReq({ body: { password: "p", totp: "123456" } }), {});
    expect(res.status).toBe(200);
    expect(h.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ ip: null }));
  });

  it("500 when update throws", async () => {
    h.user.findUnique.mockResolvedValue(ENABLED_USER);
    h.user.update.mockRejectedValue(new Error("db down"));
    const res = await POST(makeReq({ body: { password: "p", totp: "123456" } }), {});
    expect(res.status).toBe(500);
  });
});

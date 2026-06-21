import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  verifyTwoFactorToken: vi.fn(),
  generateBackupCodes: vi.fn(() => ({ plaintext: ["AAAA-BBBB"], hashed: ["h1"] })),
  encryptTwoFactorSecret: vi.fn(() => "enc-secret"),
  encryptBackupCodes: vi.fn(() => "enc-codes"),
  user: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/two-factor", () => ({
  verifyTwoFactorToken: h.verifyTwoFactorToken,
  generateBackupCodes: h.generateBackupCodes,
  encryptTwoFactorSecret: h.encryptTwoFactorSecret,
  encryptBackupCodes: h.encryptBackupCodes,
}));
vi.mock("@/lib/db", () => ({ db: { user: h.user } }));

import { POST } from "./route";

const ADMIN_TOKEN = { sub: "u1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };
const SECRET = "ABCDEFGHIJKLMNOP"; // 16 chars

function makeReq({ body, headers = {} }: { body?: unknown; headers?: Record<string, string> } = {}) {
  return {
    method: "POST",
    url: "http://localhost/api/admin/2fa/enable",
    headers: new Headers(headers),
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
  h.verifyTwoFactorToken.mockReturnValue(true);
  h.generateBackupCodes.mockReturnValue({ plaintext: ["AAAA-BBBB"], hashed: ["h1"] });
  h.encryptTwoFactorSecret.mockReturnValue("enc-secret");
  h.encryptBackupCodes.mockReturnValue("enc-codes");
});

describe("POST /api/admin/2fa/enable", () => {
  it("401 when no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await POST(makeReq({ body: { secret: SECRET, token: "123456" } }), {});
    expect(res.status).toBe(401);
  });

  it("403 when EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await POST(makeReq({ body: { secret: SECRET, token: "123456" } }), {});
    expect(res.status).toBe(403);
  });

  it("400 on validation failure (bad token)", async () => {
    const res = await POST(makeReq({ body: { secret: SECRET, token: "12" } }), {});
    expect(res.status).toBe(400);
  });

  it("404 when user not found", async () => {
    h.user.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ body: { secret: SECRET, token: "123456" } }), {});
    expect(res.status).toBe(404);
  });

  it("400 when 2FA already enabled", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", twoFactorEnabled: true });
    const res = await POST(makeReq({ body: { secret: SECRET, token: "123456" } }), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("already enabled");
  });

  it("400 when TOTP token invalid", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", twoFactorEnabled: false });
    h.verifyTwoFactorToken.mockReturnValue(false);
    const res = await POST(makeReq({ body: { secret: SECRET, token: "000000" } }), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Invalid verification code");
  });

  it("200 enables 2FA, returns backup codes, updates + audits", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", twoFactorEnabled: false });
    h.user.update.mockResolvedValue({ id: "u1" });
    const res = await POST(makeReq({ body: { secret: SECRET, token: "123456" }, headers: { "x-forwarded-for": "7.7.7.7" } }), {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.backupCodes).toEqual(["AAAA-BBBB"]);
    expect(h.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          twoFactorSecret: "enc-secret",
          twoFactorEnabled: true,
          twoFactorBackupCodes: "enc-codes",
        }),
      })
    );
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "2fa.enabled", ip: "7.7.7.7" })
    );
  });

  it("200 with null ip + no user-agent when no x-forwarded-for header", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", twoFactorEnabled: false });
    h.user.update.mockResolvedValue({ id: "u1" });
    const res = await POST(makeReq({ body: { secret: SECRET, token: "123456" } }), {});
    expect(res.status).toBe(200);
    expect(h.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ ip: null }));
  });

  it("500 when update throws", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", twoFactorEnabled: false });
    h.user.update.mockRejectedValue(new Error("db down"));
    const res = await POST(makeReq({ body: { secret: SECRET, token: "123456" } }), {});
    expect(res.status).toBe(500);
  });
});

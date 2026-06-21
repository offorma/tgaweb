import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  generateTwoFactorSecret: vi.fn(() => "SECRETBASE32"),
  buildOtpauthUri: vi.fn(() => "otpauth://totp/x"),
  generateQrCodeDataUrl: vi.fn(async () => "data:image/png;base64,AAA"),
  user: { findUnique: vi.fn() },
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/two-factor", () => ({
  generateTwoFactorSecret: h.generateTwoFactorSecret,
  buildOtpauthUri: h.buildOtpauthUri,
  generateQrCodeDataUrl: h.generateQrCodeDataUrl,
}));
vi.mock("@/lib/db", () => ({ db: { user: h.user } }));

import { POST } from "./route";

const ADMIN_TOKEN = { sub: "u1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };

function makeReq({ headers = {} }: { headers?: Record<string, string> } = {}) {
  return {
    method: "POST",
    url: "http://localhost/api/admin/2fa/setup",
    headers: new Headers(headers),
    text: async () => "",
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
  h.generateTwoFactorSecret.mockReturnValue("SECRETBASE32");
  h.buildOtpauthUri.mockReturnValue("otpauth://totp/x");
  h.generateQrCodeDataUrl.mockResolvedValue("data:image/png;base64,AAA");
});

describe("POST /api/admin/2fa/setup", () => {
  it("401 when no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await POST(makeReq(), {});
    expect(res.status).toBe(401);
  });

  it("403 when EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await POST(makeReq(), {});
    expect(res.status).toBe(403);
  });

  it("429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 5 });
    const res = await POST(makeReq(), {});
    expect(res.status).toBe(429);
  });

  it("404 when user not found", async () => {
    h.user.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq(), {});
    expect(res.status).toBe(404);
  });

  it("400 when 2FA already enabled", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", twoFactorEnabled: true });
    const res = await POST(makeReq(), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("already enabled");
  });

  it("200 returns secret, qrCode, otpauth + audits (with x-forwarded-for)", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", twoFactorEnabled: false });
    const res = await POST(makeReq({ headers: { "x-forwarded-for": "9.9.9.9, 8.8.8.8", "user-agent": "jest" } }), {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.secret).toBe("SECRETBASE32");
    expect(json.qrCode).toBe("data:image/png;base64,AAA");
    expect(json.otpauth).toBe("otpauth://totp/x");
    expect(h.buildOtpauthUri).toHaveBeenCalledWith("a@b.com", "SECRETBASE32");
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "2fa.setup.initiated", ip: "9.9.9.9" })
    );
  });

  it("200 with null ip when no x-forwarded-for", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", twoFactorEnabled: false });
    const res = await POST(makeReq(), {});
    expect(res.status).toBe(200);
    expect(h.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ ip: null }));
  });

  it("500 when QR generation throws", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", twoFactorEnabled: false });
    h.generateQrCodeDataUrl.mockRejectedValue(new Error("qr fail"));
    const res = await POST(makeReq(), {});
    expect(res.status).toBe(500);
  });
});

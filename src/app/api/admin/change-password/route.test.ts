import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  hashPassword: vi.fn(async () => "new-hash"),
  verifyPassword: vi.fn(),
  user: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({
  writeAuditLog: h.writeAuditLog,
  hashPassword: h.hashPassword,
  verifyPassword: h.verifyPassword,
}));
vi.mock("@/lib/db", () => ({ db: { user: h.user } }));

import { POST } from "./route";

function makeReq({ body, raw, headers = {} }: { body?: unknown; raw?: string; headers?: Record<string, string> } = {}) {
  return {
    method: "POST",
    url: "http://localhost/api/admin/change-password",
    headers: new Headers(headers),
    json: async () => {
      if (raw !== undefined) throw new SyntaxError("bad json");
      return body;
    },
  } as any;
}

const STRONG = "StrongPass1!xyz";

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue({ sub: "u1" });
  h.hashPassword.mockResolvedValue("new-hash");
  h.verifyPassword.mockReset();
});

describe("POST /api/admin/change-password", () => {
  it("429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 30 });
    const res = await POST(makeReq({ body: { currentPassword: "x", newPassword: STRONG } }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  it("401 when no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await POST(makeReq({ body: { currentPassword: "x", newPassword: STRONG } }));
    expect(res.status).toBe(401);
  });

  it("400 on invalid JSON", async () => {
    const res = await POST(makeReq({ raw: "{bad" }));
    expect(res.status).toBe(400);
  });

  it("400 on schema validation failure (weak new password)", async () => {
    const res = await POST(makeReq({ body: { currentPassword: "x", newPassword: "weak" } }));
    expect(res.status).toBe(400);
  });

  it("404 when user not found", async () => {
    h.user.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ body: { currentPassword: "x", newPassword: STRONG } }));
    expect(res.status).toBe(404);
  });

  it("400 + audit when current password incorrect", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", passwordHash: "old" });
    h.verifyPassword.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ body: { currentPassword: "wrong", newPassword: STRONG }, headers: { "user-agent": "jest" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("incorrect");
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "password.change.failed" })
    );
  });

  it("400 when current password incorrect, no user-agent header (undefined branch)", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", passwordHash: "old" });
    h.verifyPassword.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ body: { currentPassword: "wrong", newPassword: STRONG } }));
    expect(res.status).toBe(400);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "password.change.failed", userAgent: undefined })
    );
  });

  it("400 when new password equals current", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", passwordHash: "old" });
    // first verify (current) ok, second verify (reuse) ok
    h.verifyPassword.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    const res = await POST(makeReq({ body: { currentPassword: STRONG, newPassword: STRONG } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("same as the current");
  });

  it("200 on successful change, hashes + updates + audits", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", passwordHash: "old" });
    h.verifyPassword.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    h.user.update.mockResolvedValue({ id: "u1" });
    const res = await POST(makeReq({ body: { currentPassword: "CurrentPass1!", newPassword: STRONG } }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(h.hashPassword).toHaveBeenCalledWith(STRONG);
    expect(h.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { passwordHash: "new-hash", mustChangePassword: false, failedAttempts: 0, lockedUntil: null },
    });
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "password.change.success" })
    );
  });
});

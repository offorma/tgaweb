import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  hashPassword: vi.fn(async () => "hashed-pw"),
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({
  writeAuditLog: h.writeAuditLog,
  hashPassword: h.hashPassword,
}));
vi.mock("@/lib/db", () => ({ db: { user: h.user } }));

import { GET, PUT, DELETE } from "./route";

const VALID_ID = "abcdefghij0123456789klmn"; // 24 chars
const SELF_ID = "admin1abcdefghij01234567"; // 24 chars, == token sub
const ADMIN_TOKEN = { sub: SELF_ID, email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "ed1", email: "e@b.com", name: "Editor", role: "EDITOR" };

function makeReq({
  method = "GET",
  url = "http://localhost/api/admin/users/x",
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

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
  h.hashPassword.mockResolvedValue("hashed-pw");
});

describe("GET /api/admin/users/[id]", () => {
  it("401 when no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await GET(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(401);
  });

  it("403 when EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await GET(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(403);
  });

  it("400 on invalid id", async () => {
    const res = await GET(makeReq(), { params: { id: "bad" } });
    expect(res.status).toBe(400);
  });

  it("404 when not found", async () => {
    h.user.findUnique.mockResolvedValue(null);
    const res = await GET(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(404);
  });

  it("200 when found (resolves promise params)", async () => {
    h.user.findUnique.mockResolvedValue({ id: VALID_ID, email: "x@y.com" });
    const res = await GET(makeReq(), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(200);
    expect((await res.json()).user.id).toBe(VALID_ID);
  });
});

describe("PUT /api/admin/users/[id]", () => {
  it("400 on invalid id", async () => {
    const res = await PUT(makeReq({ method: "PUT", body: { name: "x" } }), { params: { id: "bad" } });
    expect(res.status).toBe(400);
  });

  it("400 on validation failure", async () => {
    const res = await PUT(makeReq({ method: "PUT", body: { role: "SUPERMAN" } }), { params: { id: VALID_ID } });
    expect(res.status).toBe(400);
  });

  it("404 when target not found", async () => {
    h.user.findUnique.mockResolvedValue(null);
    const res = await PUT(makeReq({ method: "PUT", body: { name: "X" } }), { params: { id: VALID_ID } });
    expect(res.status).toBe(404);
  });

  it("400 when admin deactivates self", async () => {
    h.user.findUnique.mockResolvedValue({ id: SELF_ID, role: "ADMIN", isActive: true, email: "a@b.com" });
    const res = await PUT(makeReq({ method: "PUT", body: { isActive: false } }), { params: { id: SELF_ID } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("deactivate your own");
  });

  it("400 when admin changes own role", async () => {
    h.user.findUnique.mockResolvedValue({ id: SELF_ID, role: "ADMIN", isActive: true, email: "a@b.com" });
    const res = await PUT(makeReq({ method: "PUT", body: { role: "EDITOR" } }), { params: { id: SELF_ID } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("change your own role");
  });

  it("400 when demoting the last active admin", async () => {
    h.user.findUnique.mockResolvedValue({ id: VALID_ID, role: "ADMIN", isActive: true, email: "t@y.com" });
    h.user.count.mockResolvedValue(0);
    const res = await PUT(makeReq({ method: "PUT", body: { role: "EDITOR" } }), { params: { id: VALID_ID } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("last active admin");
  });

  it("400 when deactivating the last active admin", async () => {
    h.user.findUnique.mockResolvedValue({ id: VALID_ID, role: "ADMIN", isActive: true, email: "t@y.com" });
    h.user.count.mockResolvedValue(0);
    const res = await PUT(makeReq({ method: "PUT", body: { isActive: false } }), { params: { id: VALID_ID } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("deactivate the last active admin");
  });

  it("updates metadata + password reset, strips db-only fields, audits", async () => {
    h.user.findUnique.mockResolvedValue({ id: VALID_ID, role: "EDITOR", isActive: true, email: "t@y.com" });
    h.user.update.mockResolvedValue({ id: VALID_ID, email: "t@y.com", role: "EDITOR" });
    const body = {
      id: "should-strip",
      createdAt: "x",
      updatedAt: "y",
      passwordHash: "z",
      name: "Renamed",
      mustEnable2FA: false,
      mustChangePassword: false,
      newPassword: "StrongPass1!xyz",
    };
    const res = await PUT(makeReq({ method: "PUT", body, headers: { "user-agent": "jest" } }), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
    const arg = h.user.update.mock.calls[0][0];
    expect(arg.data).not.toHaveProperty("createdAt");
    expect(arg.data.passwordHash).toBe("hashed-pw");
    expect(arg.data.mustChangePassword).toBe(true);
    expect(arg.data.failedAttempts).toBe(0);
    expect(arg.data.lockedUntil).toBeNull();
    expect(h.hashPassword).toHaveBeenCalledWith("StrongPass1!xyz");
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.update", entityId: VALID_ID })
    );
  });

  it("allows demoting an admin when other admins exist", async () => {
    h.user.findUnique.mockResolvedValue({ id: VALID_ID, role: "ADMIN", isActive: true, email: "t@y.com" });
    h.user.count.mockResolvedValue(2);
    h.user.update.mockResolvedValue({ id: VALID_ID, role: "EDITOR" });
    const res = await PUT(makeReq({ method: "PUT", body: { role: "EDITOR" } }), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
  });

  it("updates isActive=true + role same-as-self without error (covers no-op branches)", async () => {
    // self, role provided but equal to current → no role-change block; isActive true allowed
    h.user.findUnique.mockResolvedValue({ id: SELF_ID, role: "ADMIN", isActive: true, email: "a@b.com" });
    h.user.update.mockResolvedValue({ id: SELF_ID, role: "ADMIN" });
    const res = await PUT(
      makeReq({ method: "PUT", body: { role: "ADMIN", isActive: true } }),
      { params: { id: SELF_ID } }
    );
    expect(res.status).toBe(200);
    const arg = h.user.update.mock.calls[0][0];
    expect(arg.data.isActive).toBe(true);
  });

  it("allows deactivating an admin when other admins exist", async () => {
    h.user.findUnique.mockResolvedValue({ id: VALID_ID, role: "ADMIN", isActive: true, email: "t@y.com" });
    h.user.count.mockResolvedValue(3);
    h.user.update.mockResolvedValue({ id: VALID_ID, isActive: false });
    const res = await PUT(makeReq({ method: "PUT", body: { isActive: false } }), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
  });

  it("500 when update throws", async () => {
    h.user.findUnique.mockResolvedValue({ id: VALID_ID, role: "EDITOR", isActive: true, email: "t@y.com" });
    h.user.update.mockRejectedValue(new Error("db down"));
    const res = await PUT(makeReq({ method: "PUT", body: { name: "X" } }), { params: { id: VALID_ID } });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/admin/users/[id]", () => {
  it("400 on invalid id", async () => {
    const res = await DELETE(makeReq({ method: "DELETE" }), { params: { id: "bad" } });
    expect(res.status).toBe(400);
  });

  it("400 when deleting self", async () => {
    const res = await DELETE(makeReq({ method: "DELETE" }), { params: { id: SELF_ID } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("delete your own");
  });

  it("404 when not found", async () => {
    h.user.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeReq({ method: "DELETE" }), { params: { id: VALID_ID } });
    expect(res.status).toBe(404);
  });

  it("400 when deleting the last active admin", async () => {
    h.user.findUnique.mockResolvedValue({ id: VALID_ID, role: "ADMIN", isActive: true, email: "t@y.com" });
    h.user.count.mockResolvedValue(0);
    const res = await DELETE(makeReq({ method: "DELETE" }), { params: { id: VALID_ID } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("last active admin");
  });

  it("deletes a non-admin target, audits, returns ok", async () => {
    h.user.findUnique.mockResolvedValue({ id: VALID_ID, role: "EDITOR", isActive: true, email: "t@y.com" });
    h.user.delete.mockResolvedValue({ id: VALID_ID });
    const res = await DELETE(makeReq({ method: "DELETE", headers: { "user-agent": "jest" } }), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(h.user.delete).toHaveBeenCalledWith({ where: { id: VALID_ID } });
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.delete", entityId: VALID_ID })
    );
  });

  it("deletes an admin when other admins exist", async () => {
    h.user.findUnique.mockResolvedValue({ id: VALID_ID, role: "ADMIN", isActive: true, email: "t@y.com" });
    h.user.count.mockResolvedValue(1);
    h.user.delete.mockResolvedValue({ id: VALID_ID });
    const res = await DELETE(makeReq({ method: "DELETE" }), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
  });
});

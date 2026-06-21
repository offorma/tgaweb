import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  hashPassword: vi.fn(async () => "hashed-pw"),
  sendWelcomeEmail: vi.fn(async () => ({ sent: true })),
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
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
vi.mock("@/lib/email", () => ({ sendWelcomeEmail: h.sendWelcomeEmail }));
vi.mock("@/lib/db", () => ({ db: { user: h.user } }));

import { GET, POST } from "./route";

function makeReq({
  method = "GET",
  url = "http://localhost/api/admin/users",
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

const ADMIN_TOKEN = { sub: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "ed1", email: "e@b.com", name: "Editor", role: "EDITOR" };

const VALID_USER = {
  name: "New User",
  email: "New@Example.com",
  role: "EDITOR",
  password: "StrongPass1!xyz",
  requireTwoFactor: true,
  requirePasswordChange: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
  h.hashPassword.mockResolvedValue("hashed-pw");
  h.sendWelcomeEmail.mockResolvedValue({ sent: true });
});

describe("GET /api/admin/users", () => {
  it("returns 401 when no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(401);
  });

  it("returns 403 when EDITOR (ADMIN-only)", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 12 });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(429);
  });

  it("lists users and resolves creators", async () => {
    h.user.findMany
      .mockResolvedValueOnce([
        { id: "u1", email: "x@y.com", name: "X", createdBy: "admin1" },
        { id: "u2", email: "z@y.com", name: "Z", createdBy: null },
      ])
      .mockResolvedValueOnce([{ id: "admin1", name: "Admin", email: "a@b.com" }]);
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.users).toHaveLength(2);
    expect(json.users[0].creator).toEqual({ id: "admin1", name: "Admin", email: "a@b.com" });
    expect(json.users[1].creator).toBeNull();
    expect(h.user.findMany).toHaveBeenCalledTimes(2);
  });

  it("skips creator lookup when no createdBy values", async () => {
    h.user.findMany.mockResolvedValueOnce([{ id: "u1", email: "x@y.com", name: "X", createdBy: null }]);
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(200);
    expect(h.user.findMany).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when DB throws", async () => {
    h.user.findMany.mockRejectedValue(new Error("db down"));
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Internal server error");
  });
});

describe("POST /api/admin/users", () => {
  it("returns 401 when no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await POST(makeReq({ method: "POST", body: VALID_USER }), {});
    expect(res.status).toBe(401);
  });

  it("returns 403 when EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await POST(makeReq({ method: "POST", body: VALID_USER }), {});
    expect(res.status).toBe(403);
  });

  it("returns 400 on validation failure", async () => {
    const res = await POST(makeReq({ method: "POST", body: { name: "" } }), {});
    expect(res.status).toBe(400);
    expect(h.user.create).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON", async () => {
    const req = makeReq({ method: "POST" });
    req.text = async () => "{not json";
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 409 when email already exists", async () => {
    h.user.findUnique.mockResolvedValue({ id: "dup", email: "new@example.com" });
    const res = await POST(makeReq({ method: "POST", body: VALID_USER }), {});
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("already exists");
  });

  it("creates user, audits, sends welcome email, returns 201", async () => {
    h.user.findUnique.mockResolvedValue(null);
    h.user.create.mockResolvedValue({
      id: "newid",
      email: "new@example.com",
      name: "New User",
      role: "EDITOR",
      isActive: true,
      mustEnable2FA: true,
      mustChangePassword: true,
      createdAt: new Date(),
    });
    const res = await POST(
      makeReq({ method: "POST", body: VALID_USER, headers: { "user-agent": "jest" } }),
      {}
    );
    expect(res.status).toBe(201);
    expect(h.hashPassword).toHaveBeenCalledWith("StrongPass1!xyz");
    expect(h.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "new@example.com", createdBy: "admin1", passwordHash: "hashed-pw" }),
      })
    );
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.create", entityId: "newid" })
    );
    expect(h.sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "new@example.com", role: "EDITOR" })
    );
  });

  it("still returns 201 when welcome email throws (fails soft)", async () => {
    h.user.findUnique.mockResolvedValue(null);
    h.user.create.mockResolvedValue({
      id: "newid",
      email: "new@example.com",
      name: "New User",
      role: "EDITOR",
      isActive: true,
      mustEnable2FA: true,
      mustChangePassword: true,
      createdAt: new Date(),
    });
    h.sendWelcomeEmail.mockRejectedValue(new Error("smtp fail"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeReq({ method: "POST", body: VALID_USER }), {});
    expect(res.status).toBe(201);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("returns 500 when DB create throws", async () => {
    h.user.findUnique.mockResolvedValue(null);
    h.user.create.mockRejectedValue(new Error("db down"));
    const res = await POST(makeReq({ method: "POST", body: VALID_USER }), {});
    expect(res.status).toBe(500);
  });
});

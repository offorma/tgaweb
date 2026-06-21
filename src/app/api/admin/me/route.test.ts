import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  user: { findUnique: vi.fn() },
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/db", () => ({ db: { user: h.user } }));

import { GET } from "./route";

const ADMIN_TOKEN = { sub: "u1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };

function makeReq() {
  return {
    method: "GET",
    url: "http://localhost/api/admin/me",
    headers: new Headers(),
    text: async () => "",
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
});

describe("GET /api/admin/me", () => {
  it("401 when no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(401);
  });

  it("429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 9 });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(429);
  });

  it("allows EDITOR (EDITOR-level route)", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    h.user.findUnique.mockResolvedValue({ id: "u2", email: "e@b.com" });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(200);
  });

  it("404 when user not found", async () => {
    h.user.findUnique.mockResolvedValue(null);
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(404);
  });

  it("200 returns profile", async () => {
    h.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.com", name: "Admin" });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(200);
    expect((await res.json()).user.email).toBe("a@b.com");
    expect(h.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "u1" } }));
  });

  it("500 when DB throws", async () => {
    h.user.findUnique.mockRejectedValue(new Error("db down"));
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(500);
  });
});

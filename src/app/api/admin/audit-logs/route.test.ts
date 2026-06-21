import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  auditLog: { findMany: vi.fn() },
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/db", () => ({ db: { auditLog: h.auditLog } }));

import { GET } from "./route";

function makeReq({
  url = "http://localhost/api/admin/audit-logs",
  headers = {},
}: { url?: string; headers?: Record<string, string> } = {}) {
  return { method: "GET", url, headers: new Headers(headers), text: async () => "" } as any;
}

const ADMIN_TOKEN = { sub: "u1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
});

describe("GET /api/admin/audit-logs", () => {
  it("returns logs with default limit 50", async () => {
    h.auditLog.findMany.mockResolvedValue([{ id: "a1", action: "x" }]);
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(200);
    expect((await res.json()).logs).toHaveLength(1);
    expect(h.auditLog.findMany.mock.calls[0][0].take).toBe(50);
  });

  it("respects the limit query param", async () => {
    h.auditLog.findMany.mockResolvedValue([]);
    await GET(makeReq({ url: "http://localhost/api/admin/audit-logs?limit=10" }), {});
    expect(h.auditLog.findMany.mock.calls[0][0].take).toBe(10);
  });

  it("caps the limit at 100", async () => {
    h.auditLog.findMany.mockResolvedValue([]);
    await GET(makeReq({ url: "http://localhost/api/admin/audit-logs?limit=500" }), {});
    expect(h.auditLog.findMany.mock.calls[0][0].take).toBe(100);
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
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 6 });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(429);
  });

  it("returns 500 when DB throws", async () => {
    h.auditLog.findMany.mockRejectedValue(new Error("db down"));
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(500);
  });
});

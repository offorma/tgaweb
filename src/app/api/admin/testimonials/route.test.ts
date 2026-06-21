import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  invalidateCache: vi.fn(),
  delegate: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
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
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/content", () => ({ invalidateCache: h.invalidateCache }));
vi.mock("@/lib/db", () => ({ db: { testimonial: h.delegate } }));

import { GET, POST } from "./route";
import { GET as GET_ONE, PUT, DELETE } from "./[id]/route";

const VALID_ID = "abcdefghij0123456789klmn";

function makeReq({
  method = "GET",
  url = "http://localhost/api/admin/testimonials",
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

const ADMIN_TOKEN = { sub: "u1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };

const VALID = {
  name: "Mary Smith",
  relation: "Parent of Year 3 pupil",
  quote: "The school transformed my child's love of learning entirely.",
  rating: 5,
  order: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
});

describe("rate limiting", () => {
  it("returns 429 when the IP is rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 30 });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
  });
});

describe("auth & authz", () => {
  it("returns 401 when there is no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(401);
  });

  it("returns 403 + audit log when an EDITOR hits ADMIN POST", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await POST(makeReq({ method: "POST", body: VALID }), {});
    expect(res.status).toBe(403);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.stringContaining("auth.denied") })
    );
  });

  it("allows an EDITOR to perform a read-only GET", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    h.delegate.findMany.mockResolvedValue([]);
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(200);
  });
});

describe("GET list", () => {
  it("returns the items ordered", async () => {
    h.delegate.findMany.mockResolvedValue([{ id: VALID_ID, name: "Mary" }]);
    const res = await GET(makeReq(), {});
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(h.delegate.findMany).toHaveBeenCalledWith({ orderBy: { order: "asc" } });
  });
});

describe("POST create", () => {
  it("creates, invalidates cache, audits, returns 201", async () => {
    h.delegate.create.mockResolvedValue({ id: VALID_ID, ...VALID });
    const res = await POST(makeReq({ method: "POST", body: VALID }), {});
    expect(res.status).toBe(201);
    expect(h.delegate.create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: "Mary Smith" }) });
    expect(h.invalidateCache).toHaveBeenCalledWith("testimonials");
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.stringContaining("api.post") })
    );
  });

  it("returns 400 on schema validation failure", async () => {
    const res = await POST(makeReq({ method: "POST", body: { name: "" } }), {});
    expect(res.status).toBe(400);
    expect(h.delegate.create).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = makeReq({ method: "POST" });
    req.text = async () => "{not json";
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 500 when the DB throws", async () => {
    h.delegate.create.mockRejectedValue(new Error("db down"));
    const res = await POST(makeReq({ method: "POST", body: VALID }), {});
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Internal server error");
  });
});

describe("item routes [id]", () => {
  it("GET returns 400 for an invalid id", async () => {
    const res = await GET_ONE(makeReq(), { params: { id: "bad" } });
    expect(res.status).toBe(400);
  });

  it("GET returns 404 when not found", async () => {
    h.delegate.findUnique.mockResolvedValue(null);
    const res = await GET_ONE(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(404);
  });

  it("GET returns the item when found (Promise params)", async () => {
    h.delegate.findUnique.mockResolvedValue({ id: VALID_ID, name: "Mary" });
    const res = await GET_ONE(makeReq(), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(200);
    expect((await res.json()).item.name).toBe("Mary");
  });

  it("PUT strips DB-only fields and updates", async () => {
    h.delegate.update.mockResolvedValue({ id: VALID_ID, ...VALID });
    const body = { ...VALID, id: "x", createdAt: "y", updatedAt: "z" };
    const res = await PUT(makeReq({ method: "PUT", body }), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
    const arg = h.delegate.update.mock.calls[0][0];
    expect(arg.data).not.toHaveProperty("createdAt");
    expect(h.invalidateCache).toHaveBeenCalledWith("testimonials");
  });

  it("PUT returns 400 on invalid id", async () => {
    const res = await PUT(makeReq({ method: "PUT", body: VALID }), { params: { id: "bad" } });
    expect(res.status).toBe(400);
  });

  it("PUT returns 400 on schema validation failure", async () => {
    const res = await PUT(makeReq({ method: "PUT", body: { rating: 99 } }), { params: { id: VALID_ID } });
    expect(res.status).toBe(400);
    expect(h.delegate.update).not.toHaveBeenCalled();
  });

  it("PUT returns 403 for an EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await PUT(makeReq({ method: "PUT", body: VALID }), { params: { id: VALID_ID } });
    expect(res.status).toBe(403);
  });

  it("DELETE removes the item and invalidates cache", async () => {
    h.delegate.delete.mockResolvedValue({ id: VALID_ID });
    const res = await DELETE(makeReq({ method: "DELETE" }), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
    expect(h.delegate.delete).toHaveBeenCalledWith({ where: { id: VALID_ID } });
    expect(h.invalidateCache).toHaveBeenCalledWith("testimonials");
  });

  it("DELETE returns 400 on invalid id", async () => {
    const res = await DELETE(makeReq({ method: "DELETE" }), { params: { id: "bad" } });
    expect(res.status).toBe(400);
  });

  it("DELETE returns 500 when the DB throws", async () => {
    h.delegate.delete.mockRejectedValue(new Error("db down"));
    const res = await DELETE(makeReq({ method: "DELETE" }), { params: { id: VALID_ID } });
    expect(res.status).toBe(500);
  });
});

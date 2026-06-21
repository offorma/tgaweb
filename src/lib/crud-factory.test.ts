import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

/**
 * crud-factory branches NOT exercised by faculty/route.test.ts:
 *  - custom `defaultOrderBy`
 *  - explicit `updateSchema` (instead of schema.partial())
 *  - `requiredRole: "EDITOR"` for the write routes
 *
 * Same mocking recipe as the faculty route test.
 */
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
vi.mock("@/lib/db", () => ({ db: { widget: h.delegate } }));
vi.mock("@prisma/client", () => ({ Prisma: {} }));

import { makeCrudRoutes, makeCrudItemRoutes } from "./crud-factory";

const VALID_ID = "abcdefghij0123456789klmn";
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };

const createSchema = z.strictObject({ title: z.string().min(1) });
const updateSchema = z.strictObject({ title: z.string().min(1).optional() });

function makeReq({ method = "GET", url = "http://localhost/api/admin/widget", body }: any = {}) {
  return {
    method,
    url,
    headers: new Headers(),
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as any;
}

const cfg = {
  model: "widget" as any,
  schema: createSchema,
  cacheKey: "widget",
  entityName: "Widget",
  defaultOrderBy: { createdAt: "desc" } as Record<string, "asc" | "desc">,
  updateSchema,
  requiredRole: "EDITOR" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(EDITOR_TOKEN);
});

describe("makeCrudRoutes with custom config", () => {
  it("GET uses the custom defaultOrderBy", async () => {
    const { GET } = makeCrudRoutes(cfg);
    h.delegate.findMany.mockResolvedValue([]);
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(200);
    expect(h.delegate.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });

  it("POST allows an EDITOR (requiredRole: EDITOR) to create", async () => {
    const { POST } = makeCrudRoutes(cfg);
    h.delegate.create.mockResolvedValue({ id: VALID_ID, title: "Hi" });
    const res = await POST(makeReq({ method: "POST", body: { title: "Hi" } }), {});
    expect(res.status).toBe(201);
    expect(h.invalidateCache).toHaveBeenCalledWith("widget");
  });

  it("POST returns 400 when the body fails schema validation", async () => {
    const { POST } = makeCrudRoutes(cfg);
    const res = await POST(makeReq({ method: "POST", body: { title: "" } }), {});
    expect(res.status).toBe(400);
    expect(h.delegate.create).not.toHaveBeenCalled();
  });
});

describe("makeCrudItemRoutes with explicit updateSchema + EDITOR role", () => {
  it("PUT validates against the explicit updateSchema and updates", async () => {
    const { PUT } = makeCrudItemRoutes(cfg);
    h.delegate.update.mockResolvedValue({ id: VALID_ID, title: "New" });
    const res = await PUT(
      makeReq({ method: "PUT", body: { title: "New" } }),
      { params: { id: VALID_ID } }
    );
    expect(res.status).toBe(200);
    expect(h.delegate.update).toHaveBeenCalledWith({
      where: { id: VALID_ID },
      data: { title: "New" },
    });
    expect(h.invalidateCache).toHaveBeenCalledWith("widget");
  });

  it("PUT returns 400 when the explicit updateSchema rejects the body", async () => {
    const { PUT } = makeCrudItemRoutes(cfg);
    const res = await PUT(
      makeReq({ method: "PUT", body: { title: "" } }),
      { params: { id: VALID_ID } }
    );
    expect(res.status).toBe(400);
    expect(h.delegate.update).not.toHaveBeenCalled();
  });

  it("GET single returns the item for an EDITOR", async () => {
    const { GET } = makeCrudItemRoutes(cfg);
    h.delegate.findUnique.mockResolvedValue({ id: VALID_ID, title: "X" });
    const res = await GET(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
  });

  it("DELETE removes the item (EDITOR allowed)", async () => {
    const { DELETE } = makeCrudItemRoutes(cfg);
    h.delegate.delete.mockResolvedValue({ id: VALID_ID });
    const res = await DELETE(makeReq({ method: "DELETE" }), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(200);
    expect(h.delegate.delete).toHaveBeenCalledWith({ where: { id: VALID_ID } });
  });
});

describe("makeCrudItemRoutes falls back to schema.partial() when no updateSchema", () => {
  it("PUT uses schema.partial() for the default config", async () => {
    const { PUT } = makeCrudItemRoutes({
      model: "widget" as any,
      schema: createSchema,
      cacheKey: "widget",
      entityName: "Widget",
    });
    h.getToken.mockResolvedValue({ ...EDITOR_TOKEN, role: "ADMIN" }); // default cfg requires ADMIN
    h.delegate.update.mockResolvedValue({ id: VALID_ID });
    // partial() makes title optional, so an empty body passes
    const res = await PUT(makeReq({ method: "PUT", body: {} }), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(200);
  });
});

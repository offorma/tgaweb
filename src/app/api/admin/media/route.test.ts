import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  getCloudinary: vi.fn(),
  resources: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/cloudinary", () => ({ getCloudinary: h.getCloudinary }));

import { GET, DELETE } from "./route";

function makeReq({
  method = "GET",
  url = "http://localhost/api/admin/media",
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
    json: async () => body,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as any;
}

const ADMIN_TOKEN = { sub: "u1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };

const IMG_RESOURCE = {
  public_id: "tga/img1",
  secure_url: "https://res/tga/img1.jpg",
  format: "jpg",
  resource_type: "image",
  bytes: 1000,
  width: 100,
  height: 100,
  created_at: "2024-01-01",
};
const RAW_RESOURCE = {
  public_id: "tga/doc1",
  secure_url: "https://res/tga/doc1.pdf",
  format: "pdf",
  resource_type: "raw",
  bytes: 2000,
  created_at: "2024-01-02",
};

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
  h.getCloudinary.mockResolvedValue({
    api: { resources: h.resources },
    uploader: { destroy: h.destroy },
  });
});

describe("GET /api/admin/media", () => {
  it("lists image + raw resources for type=all", async () => {
    h.resources
      .mockResolvedValueOnce({ resources: [IMG_RESOURCE], next_cursor: "c2" })
      .mockResolvedValueOnce({ resources: [RAW_RESOURCE] });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(2);
    expect(json.nextCursor).toBe("c2");
    expect(h.resources).toHaveBeenCalledTimes(2);
  });

  it("lists only raw resources for type=raw (no second fetch)", async () => {
    h.resources.mockResolvedValueOnce({ resources: [RAW_RESOURCE] });
    const res = await GET(
      makeReq({ url: "http://localhost/api/admin/media?type=raw&cursor=abc" }),
      {}
    );
    expect(res.status).toBe(200);
    expect(h.resources).toHaveBeenCalledTimes(1);
    expect(h.resources.mock.calls[0][0].resource_type).toBe("raw");
  });

  it("handles empty resources arrays (image type)", async () => {
    h.resources.mockResolvedValueOnce({});
    const res = await GET(makeReq({ url: "http://localhost/api/admin/media?type=image" }), {});
    const json = await res.json();
    expect(json.items).toEqual([]);
  });

  it("handles type=all with empty raw resources", async () => {
    h.resources
      .mockResolvedValueOnce({ resources: [IMG_RESOURCE] })
      .mockResolvedValueOnce({});
    const res = await GET(makeReq(), {});
    const json = await res.json();
    expect(json.items).toHaveLength(1);
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
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 8 });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(429);
  });

  it("returns 500 when cloudinary throws", async () => {
    h.resources.mockRejectedValue(new Error("cld down"));
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/admin/media", () => {
  it("deletes a resource", async () => {
    h.destroy.mockResolvedValue({ result: "ok" });
    const res = await DELETE(makeReq({ method: "DELETE", body: { publicId: "tga/img1" } }), {});
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(h.destroy).toHaveBeenCalledWith("tga/img1", { resource_type: "image" });
  });

  it("uses provided resourceType", async () => {
    h.destroy.mockResolvedValue({ result: "ok" });
    await DELETE(
      makeReq({ method: "DELETE", body: { publicId: "tga/doc1", resourceType: "raw" } }),
      {}
    );
    expect(h.destroy).toHaveBeenCalledWith("tga/doc1", { resource_type: "raw" });
  });

  it("returns 400 when publicId is missing", async () => {
    const res = await DELETE(makeReq({ method: "DELETE", body: {} }), {});
    expect(res.status).toBe(400);
    expect(h.destroy).not.toHaveBeenCalled();
  });

  it("returns 500 when cloudinary delete fails (result != ok)", async () => {
    h.destroy.mockResolvedValue({ result: "not found" });
    const res = await DELETE(makeReq({ method: "DELETE", body: { publicId: "tga/x" } }), {});
    expect(res.status).toBe(500);
  });

  it("returns 403 for EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await DELETE(makeReq({ method: "DELETE", body: { publicId: "x" } }), {});
    expect(res.status).toBe(403);
  });
});

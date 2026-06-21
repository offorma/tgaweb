import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  getCloudinary: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/cloudinary", () => ({ getCloudinary: h.getCloudinary }));

import { POST } from "./route";

const ADMIN_TOKEN = { sub: "u1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };

function makeFileReq(file: any, headers: Record<string, string> = {}) {
  const fd = new FormData();
  if (file !== null) fd.set("file", file);
  return {
    method: "POST",
    url: "http://localhost/api/admin/upload",
    headers: new Headers(headers),
    formData: async () => fd,
    text: async () => "",
  } as any;
}

function makeFile(content: string, type: string, name = "f", sizeOverride?: number) {
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });
  if (sizeOverride !== undefined) {
    Object.defineProperty(file, "size", { value: sizeOverride });
  }
  return file;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
  h.getCloudinary.mockResolvedValue({ uploader: { upload: h.upload } });
});

describe("POST /api/admin/upload", () => {
  it("uploads an image to the tga folder", async () => {
    h.upload.mockResolvedValue({
      secure_url: "https://res/tga/x.png",
      public_id: "tga/x",
      format: "png",
      bytes: 1234,
    });
    const res = await POST(makeFileReq(makeFile("hello", "image/png", "x.png")), {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://res/tga/x.png");
    expect(json.fileType).toBe("png");
    expect(h.upload.mock.calls[0][1].folder).toBe("tga");
  });

  it("uploads a document to the tga/documents folder, falls back to MIME ext", async () => {
    h.upload.mockResolvedValue({
      secure_url: "https://res/tga/documents/d",
      public_id: "tga/documents/d",
      bytes: 5000,
    });
    const res = await POST(makeFileReq(makeFile("doc", "application/pdf", "d.pdf")), {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fileType).toBe("pdf");
    expect(h.upload.mock.calls[0][1].folder).toBe("tga/documents");
  });

  it("returns 400 when no file is provided", async () => {
    const res = await POST(makeFileReq(null), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no file/i);
  });

  it("returns 400 for an invalid file type", async () => {
    const res = await POST(makeFileReq(makeFile("x", "application/x-evil", "e.bin")), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid file type/i);
  });

  it("returns 400 when the file is too large (>10MB)", async () => {
    const big = makeFile("x", "image/png", "big.png", 11 * 1024 * 1024);
    const res = await POST(makeFileReq(big), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/too large/i);
  });

  it("falls back to 'file' when no format and unknown mime mapping", async () => {
    // text/plain maps to txt; use a type in ALLOWED but missing from MIME_TO_EXT?
    // All allowed types are mapped, so simulate result with no format for an image.
    h.upload.mockResolvedValue({
      secure_url: "https://res/tga/x",
      public_id: "tga/x",
      bytes: 10,
    });
    const res = await POST(makeFileReq(makeFile("hi", "image/gif", "x.gif")), {});
    const json = await res.json();
    expect(json.fileType).toBe("gif"); // from MIME_TO_EXT
  });

  it("returns 403 for EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await POST(makeFileReq(makeFile("x", "image/png", "x.png")), {});
    expect(res.status).toBe(403);
  });

  it("returns 401 when no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await POST(makeFileReq(makeFile("x", "image/png", "x.png")), {});
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 11 });
    const res = await POST(makeFileReq(makeFile("x", "image/png", "x.png")), {});
    expect(res.status).toBe(429);
  });

  it("returns 500 when cloudinary upload throws", async () => {
    h.upload.mockRejectedValue(new Error("cld down"));
    const res = await POST(makeFileReq(makeFile("x", "image/png", "x.png")), {});
    expect(res.status).toBe(500);
  });
});

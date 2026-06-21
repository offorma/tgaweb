import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  updateSecret: vi.fn(),
  deleteSecret: vi.fn(),
  secret: { findUnique: vi.fn(), findFirst: vi.fn() },
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/secrets-data", () => ({
  updateSecret: h.updateSecret,
  deleteSecret: h.deleteSecret,
}));
vi.mock("@/lib/db", () => ({ db: { secret: h.secret } }));

import { GET, PUT, DELETE } from "./route";

const VALID_ID = "abcdefghij0123456789klmn";

function makeReq({
  method = "GET",
  url = "http://localhost/api/admin/secrets/" + VALID_ID,
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

const SECRET_ROW = {
  id: VALID_ID,
  key: "SMTP_PASSWORD",
  category: "email",
  description: "d",
  previewHint: "su…",
  ciphertext: "CIPHER",
  lastRotatedAt: null,
  createdAt: null,
  updatedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
});

describe("GET /api/admin/secrets/[id]", () => {
  it("returns safe metadata", async () => {
    h.secret.findUnique.mockResolvedValue(SECRET_ROW);
    const res = await GET(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
    expect((await res.json()).secret).not.toHaveProperty("ciphertext");
  });

  it("returns 400 on invalid id", async () => {
    const res = await GET(makeReq(), { params: { id: "bad" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 when not found", async () => {
    h.secret.findUnique.mockResolvedValue(null);
    const res = await GET(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(404);
  });

  it("returns 403 for EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await GET(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 5 });
    const res = await GET(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(429);
  });
});

describe("PUT /api/admin/secrets/[id]", () => {
  it("updates metadata + value, audits", async () => {
    h.secret.findFirst.mockResolvedValue(null);
    h.updateSecret.mockResolvedValue({ ...SECRET_ROW });
    const body = { key: "NEW_KEY", category: "app", description: "x", value: "newval" };
    const res = await PUT(
      makeReq({ method: "PUT", body, headers: { "x-forwarded-for": "9.9.9.9, 1.1.1.1", "user-agent": "ua" } }),
      { params: { id: VALID_ID } }
    );
    expect(res.status).toBe(200);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "secret.update", ip: "9.9.9.9" })
    );
    const meta = JSON.parse(h.writeAuditLog.mock.calls.find((c) => c[0].action === "secret.update")[0].meta);
    expect(meta.valueChanged).toBe(true);
  });

  it("updates without key (skips dup check), no value", async () => {
    h.updateSecret.mockResolvedValue({ ...SECRET_ROW });
    const res = await PUT(makeReq({ method: "PUT", body: { description: "only" } }), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(200);
    expect(h.secret.findFirst).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid id", async () => {
    const res = await PUT(makeReq({ method: "PUT", body: { description: "x" } }), {
      params: { id: "bad" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 on validation failure", async () => {
    const res = await PUT(makeReq({ method: "PUT", body: { key: "lowercase" } }), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(400);
  });

  it("returns 409 on duplicate key", async () => {
    h.secret.findFirst.mockResolvedValue({ id: "other", key: "NEW_KEY" });
    const res = await PUT(makeReq({ method: "PUT", body: { key: "NEW_KEY" } }), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(409);
    expect(h.updateSecret).not.toHaveBeenCalled();
  });

  it("returns 500 when updateSecret throws", async () => {
    h.secret.findFirst.mockResolvedValue(null);
    h.updateSecret.mockRejectedValue(new Error("boom"));
    const res = await PUT(makeReq({ method: "PUT", body: { key: "NEW_KEY" } }), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/admin/secrets/[id]", () => {
  it("deletes and audits", async () => {
    h.secret.findUnique.mockResolvedValue(SECRET_ROW);
    h.deleteSecret.mockResolvedValue(undefined);
    const res = await DELETE(makeReq({ method: "DELETE" }), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(h.deleteSecret).toHaveBeenCalledWith(VALID_ID);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "secret.delete" })
    );
  });

  it("returns 400 on invalid id", async () => {
    const res = await DELETE(makeReq({ method: "DELETE" }), { params: { id: "bad" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 when not found", async () => {
    h.secret.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeReq({ method: "DELETE" }), { params: { id: VALID_ID } });
    expect(res.status).toBe(404);
    expect(h.deleteSecret).not.toHaveBeenCalled();
  });
});

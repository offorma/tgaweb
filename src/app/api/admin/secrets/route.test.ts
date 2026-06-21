import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  getAllSecrets: vi.fn(),
  getSecretStats: vi.fn(),
  createSecret: vi.fn(),
  isMasterKeyConfigured: vi.fn(() => true),
  secret: { findUnique: vi.fn() },
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/secrets-data", () => ({
  getAllSecrets: h.getAllSecrets,
  getSecretStats: h.getSecretStats,
  createSecret: h.createSecret,
}));
vi.mock("@/lib/secrets", () => ({ isMasterKeyConfigured: h.isMasterKeyConfigured }));
vi.mock("@/lib/db", () => ({ db: { secret: h.secret } }));

import { GET, POST } from "./route";

function makeReq({
  method = "GET",
  url = "http://localhost/api/admin/secrets",
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

const VALID_SECRET = {
  key: "SMTP_PASSWORD",
  category: "email",
  description: "smtp pw",
  value: "supersecret",
};

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
  h.isMasterKeyConfigured.mockReturnValue(true);
});

describe("GET /api/admin/secrets", () => {
  it("returns masked secrets + stats", async () => {
    h.getAllSecrets.mockResolvedValue([
      {
        id: "s1",
        key: "K",
        category: "app",
        description: "d",
        previewHint: "ab…",
        ciphertext: "SECRET_CIPHER",
        lastRotatedAt: null,
        createdAt: null,
        updatedAt: null,
      },
    ]);
    h.getSecretStats.mockResolvedValue({ total: 1 });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.secrets[0]).not.toHaveProperty("ciphertext");
    expect(json.stats.total).toBe(1);
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
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 5 });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(429);
  });
});

describe("POST /api/admin/secrets", () => {
  it("creates a secret, returns 201", async () => {
    h.secret.findUnique.mockResolvedValue(null);
    h.createSecret.mockResolvedValue({
      id: "s1",
      key: "SMTP_PASSWORD",
      category: "email",
      description: "smtp pw",
      previewHint: "su…",
      lastRotatedAt: null,
    });
    const res = await POST(makeReq({ method: "POST", body: VALID_SECRET }), {});
    expect(res.status).toBe(201);
    expect((await res.json()).secret.key).toBe("SMTP_PASSWORD");
  });

  it("returns 503 when master key not configured", async () => {
    h.isMasterKeyConfigured.mockReturnValue(false);
    const res = await POST(makeReq({ method: "POST", body: VALID_SECRET }), {});
    expect(res.status).toBe(503);
    expect(h.createSecret).not.toHaveBeenCalled();
  });

  it("returns 400 on validation failure", async () => {
    const res = await POST(
      makeReq({ method: "POST", body: { key: "lower", category: "x", value: "" } }),
      {}
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 on duplicate key", async () => {
    h.secret.findUnique.mockResolvedValue({ id: "existing", key: "SMTP_PASSWORD" });
    const res = await POST(makeReq({ method: "POST", body: VALID_SECRET }), {});
    expect(res.status).toBe(409);
    expect(h.createSecret).not.toHaveBeenCalled();
  });

  it("returns 403 for EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await POST(makeReq({ method: "POST", body: VALID_SECRET }), {});
    expect(res.status).toBe(403);
  });

  it("returns 500 when createSecret throws", async () => {
    h.secret.findUnique.mockResolvedValue(null);
    h.createSecret.mockRejectedValue(new Error("boom"));
    const res = await POST(makeReq({ method: "POST", body: VALID_SECRET }), {});
    expect(res.status).toBe(500);
  });
});

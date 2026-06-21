import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  encryptSecret: vi.fn(),
  generateRandomSecret: vi.fn(),
  invalidateSecretsCache: vi.fn(),
  secret: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/secrets", () => ({
  encryptSecret: h.encryptSecret,
  generateRandomSecret: h.generateRandomSecret,
}));
vi.mock("@/lib/secrets-data", () => ({ invalidateSecretsCache: h.invalidateSecretsCache }));
vi.mock("@/lib/db", () => ({ db: { secret: h.secret } }));

import { POST } from "./route";

const VALID_ID = "abcdefghij0123456789klmn";

function makeReq({
  method = "POST",
  url = "http://localhost/api/admin/secrets/" + VALID_ID + "/rotate",
  headers = {},
}: { method?: string; url?: string; headers?: Record<string, string> } = {}) {
  return { method, url, headers: new Headers(headers), text: async () => "" } as any;
}

const ADMIN_TOKEN = { sub: "u1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };
const SECRET_ROW = { id: VALID_ID, key: "SMTP_PASSWORD", ciphertext: "OLD" };

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
});

describe("POST /api/admin/secrets/[id]/rotate", () => {
  it("rotates: generates value, encrypts, updates, audits", async () => {
    h.secret.findUnique.mockResolvedValue(SECRET_ROW);
    h.generateRandomSecret.mockReturnValue("brand-new-value");
    h.encryptSecret.mockReturnValue({ ciphertext: "NEW_CIPHER", previewHint: "br…" });
    h.secret.update.mockResolvedValue({});
    const res = await POST(
      makeReq({ headers: { "x-forwarded-for": "8.8.8.8", "user-agent": "ua" } }),
      { params: { id: VALID_ID } }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.value).toBe("brand-new-value");
    expect(json.previewHint).toBe("br…");
    expect(h.generateRandomSecret).toHaveBeenCalledWith(40);
    expect(h.invalidateSecretsCache).toHaveBeenCalled();
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "secret.rotate", ip: "8.8.8.8" })
    );
  });

  it("rotates with no forwarding headers (ip null, userAgent undefined)", async () => {
    h.secret.findUnique.mockResolvedValue(SECRET_ROW);
    h.generateRandomSecret.mockReturnValue("v");
    h.encryptSecret.mockReturnValue({ ciphertext: "C", previewHint: "v…" });
    h.secret.update.mockResolvedValue({});
    const res = await POST(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "secret.rotate", ip: null, userAgent: undefined })
    );
  });

  it("returns 400 on invalid id", async () => {
    const res = await POST(makeReq(), { params: { id: "bad" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 when not found", async () => {
    h.secret.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(404);
  });

  it("returns 500 when encrypt fails (master key not configured)", async () => {
    h.secret.findUnique.mockResolvedValue(SECRET_ROW);
    h.generateRandomSecret.mockReturnValue("v");
    h.encryptSecret.mockImplementation(() => {
      throw new Error("SECRETS_MASTER_KEY is not set");
    });
    const res = await POST(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(500);
    expect(h.secret.update).not.toHaveBeenCalled();
  });

  it("returns 403 for EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await POST(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 9 });
    const res = await POST(makeReq(), { params: { id: VALID_ID } });
    expect(res.status).toBe(429);
  });
});

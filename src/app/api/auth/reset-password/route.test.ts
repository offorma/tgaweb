import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  hashPassword: vi.fn(async () => "new-bcrypt-hash"),
  hashToken: vi.fn(() => "hashed-token"),
  tokenFindUnique: vi.fn(),
  tokenUpdate: vi.fn(),
  tokenDeleteMany: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  transaction: vi.fn(async (ops: unknown) => ops),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({
  writeAuditLog: h.writeAuditLog,
  hashPassword: h.hashPassword,
}));
vi.mock("@/lib/two-factor", () => ({ hashToken: h.hashToken }));
vi.mock("@/lib/db", () => ({
  db: {
    passwordResetToken: {
      findUnique: h.tokenFindUnique,
      update: h.tokenUpdate,
      deleteMany: h.tokenDeleteMany,
    },
    user: { findUnique: h.userFindUnique, update: h.userUpdate },
    $transaction: h.transaction,
  },
}));

import { POST } from "./route";

function makeReq({
  method = "POST",
  url = "http://localhost/api/auth/reset-password",
  body,
  headers = { "user-agent": "Mozilla/5.0" },
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
    json: async () => body,
  } as any;
}

const VALID_BODY = { token: "a-valid-reset-token", newPassword: "Str0ng!Passw0rd" };

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.hashToken.mockReturnValue("hashed-token");
  h.hashPassword.mockResolvedValue("new-bcrypt-hash");
  h.transaction.mockImplementation(async (ops: unknown) => ops);
});

describe("POST /api/auth/reset-password", () => {
  it("happy path: resets password (token found via userId), audits success", async () => {
    h.tokenFindUnique.mockResolvedValue({
      id: "t1",
      userId: "u1",
      email: "jane@example.com",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    h.userFindUnique.mockResolvedValue({ id: "u1", email: "jane@example.com" });

    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(h.userFindUnique).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(h.transaction).toHaveBeenCalled();
    expect(h.tokenDeleteMany).toHaveBeenCalledWith({ where: { userId: "u1", usedAt: null } });
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "password.reset.success" })
    );
  });

  it("looks the user up by email when the token has no userId", async () => {
    h.tokenFindUnique.mockResolvedValue({
      id: "t1",
      userId: null,
      email: "jane@example.com",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    h.userFindUnique.mockResolvedValue({ id: "u1", email: "jane@example.com" });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(200);
    expect(h.userFindUnique).toHaveBeenCalledWith({ where: { email: "jane@example.com" } });
  });

  it("handles a request with no user-agent header (userAgent undefined)", async () => {
    h.tokenFindUnique.mockResolvedValue({
      id: "t1",
      userId: "u1",
      email: "jane@example.com",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    h.userFindUnique.mockResolvedValue({ id: "u1", email: "jane@example.com" });
    const res = await POST(makeReq({ body: VALID_BODY, headers: {} }));
    expect(res.status).toBe(200);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ userAgent: undefined })
    );
  });

  it("returns 429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 88 });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("88");
  });

  it("returns 400 on schema validation failure (weak password)", async () => {
    const res = await POST(makeReq({ body: { token: "a-valid-reset-token", newPassword: "weak" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Validation failed");
    expect(h.tokenFindUnique).not.toHaveBeenCalled();
  });

  it("returns 400 with fallback detail when json() throws without issues", async () => {
    const req = makeReq({ body: VALID_BODY });
    req.json = async () => {
      throw {};
    };
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).details).toBe("Invalid request");
  });

  it("returns 400 + dummy hash + audit when the token is not found", async () => {
    h.tokenFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(400);
    expect(h.hashPassword).toHaveBeenCalledWith("dummy-password", 12);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "password.reset.invalid-token" })
    );
  });

  it("returns 400 when the token was already used", async () => {
    h.tokenFindUnique.mockResolvedValue({
      id: "t1",
      userId: "u1",
      email: "jane@example.com",
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the token is expired", async () => {
    h.tokenFindUnique.mockResolvedValue({
      id: "t1",
      userId: "u1",
      email: "jane@example.com",
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the token is valid but the user no longer exists", async () => {
    h.tokenFindUnique.mockResolvedValue({
      id: "t1",
      userId: "u1",
      email: "jane@example.com",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    h.userFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Account not found");
  });
});

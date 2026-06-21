import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  userFindUnique: vi.fn(),
  tokenCreate: vi.fn(),
  tokenDeleteMany: vi.fn(),
  generateResetToken: vi.fn(() => ({ plaintext: "plain-reset-token", hash: "hashed-token" })),
  sendPasswordResetEmail: vi.fn(async () => ({ sent: true })),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: h.userFindUnique },
    passwordResetToken: { create: h.tokenCreate, deleteMany: h.tokenDeleteMany },
  },
}));
vi.mock("@/lib/two-factor", () => ({ generateResetToken: h.generateResetToken }));
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail: h.sendPasswordResetEmail }));

import { POST } from "./route";

function makeReq({
  method = "POST",
  url = "http://localhost/api/auth/forgot-password",
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

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.generateResetToken.mockReturnValue({ plaintext: "plain-reset-token", hash: "hashed-token" });
  h.sendPasswordResetEmail.mockResolvedValue({ sent: true });
  process.env.NODE_ENV = "test";
  process.env.NEXTAUTH_URL = "https://app.example.com";
});

describe("POST /api/auth/forgot-password", () => {
  it("creates a reset token + sends email for an existing user", async () => {
    h.userFindUnique.mockResolvedValue({ id: "u1", name: "Jane", email: "jane@example.com" });
    const res = await POST(makeReq({ body: { email: "Jane@Example.com" } }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(h.tokenCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "jane@example.com", userId: "u1" }) })
    );
    expect(h.tokenDeleteMany).toHaveBeenCalled();
    expect(h.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jane@example.com", resetLink: expect.stringContaining("plain-reset-token") })
    );
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "password.reset.requested" })
    );
  });

  it("uses the localhost origin when NEXTAUTH_URL is unset", async () => {
    delete process.env.NEXTAUTH_URL;
    h.userFindUnique.mockResolvedValue({ id: "u1", name: "Jane", email: "jane@example.com" });
    await POST(makeReq({ body: { email: "jane@example.com" } }));
    expect(h.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ resetLink: expect.stringContaining("http://localhost:3000") })
    );
  });

  it("still returns generic success when the email send throws", async () => {
    h.userFindUnique.mockResolvedValue({ id: "u1", name: "Jane", email: "jane@example.com" });
    h.sendPasswordResetEmail.mockRejectedValue(new Error("smtp down"));
    const res = await POST(makeReq({ body: { email: "jane@example.com" } }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("logs the dev reset link in non-production", async () => {
    process.env.NODE_ENV = "development";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    h.userFindUnique.mockResolvedValue({ id: "u1", name: "Jane", email: "jane@example.com" });
    await POST(makeReq({ body: { email: "jane@example.com" } }));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Password reset link"));
    logSpy.mockRestore();
  });

  it("does not log the dev link in production", async () => {
    process.env.NODE_ENV = "production";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    h.userFindUnique.mockResolvedValue({ id: "u1", name: "Jane", email: "jane@example.com" });
    await POST(makeReq({ body: { email: "jane@example.com" } }));
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("audits an unknown-email attempt but returns the same generic success", async () => {
    h.userFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ body: { email: "ghost@example.com" } }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(h.tokenCreate).not.toHaveBeenCalled();
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "password.reset.unknown-email" })
    );
  });

  it("handles a request with no user-agent header (userAgent undefined)", async () => {
    h.userFindUnique.mockResolvedValue({ id: "u1", name: "Jane", email: "jane@example.com" });
    const res = await POST(makeReq({ body: { email: "jane@example.com" }, headers: {} }));
    expect(res.status).toBe(200);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ userAgent: undefined })
    );
  });

  it("returns 429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 77 });
    const res = await POST(makeReq({ body: { email: "jane@example.com" } }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("77");
  });

  it("returns 400 for an invalid email", async () => {
    const res = await POST(makeReq({ body: { email: "not-an-email" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid email address");
    expect(h.userFindUnique).not.toHaveBeenCalled();
  });
});

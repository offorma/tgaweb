import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  upsert: vi.fn(),
  verifyBotDefense: vi.fn(),
  isBotUserAgent: vi.fn(() => false),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/db", () => ({
  db: { newsletterSubscriber: { upsert: h.upsert } },
}));
vi.mock("@/lib/bot-defense", () => ({
  verifyBotDefense: h.verifyBotDefense,
  isBotUserAgent: h.isBotUserAgent,
}));

import { POST } from "./route";

function makeReq({
  method = "POST",
  url = "http://localhost/api/newsletter",
  body,
  headers = { "user-agent": "Mozilla/5.0 (human)" },
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

const VALID_BODY = {
  email: "Jane@Example.com",
  mathToken: "math-token-xyz",
  mathAnswer: "10",
  timeToken: "time-token-xyz",
};

const OK_DEFENSE = {
  ok: true,
  checks: { honeypot: true, math: true, timeTrap: true, turnstile: true, turnstileSkipped: false },
};

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.isBotUserAgent.mockReturnValue(false);
  h.verifyBotDefense.mockResolvedValue(OK_DEFENSE);
  h.upsert.mockResolvedValue({ id: "s1", email: "jane@example.com" });
});

describe("POST /api/newsletter", () => {
  it("happy path: upserts the lowercased email, audits, returns success", async () => {
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(h.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "jane@example.com" } })
    );
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "newsletter.subscribe", meta: "jane@example.com" })
    );
  });

  it("handles a request with no user-agent header (userAgent undefined)", async () => {
    const res = await POST(makeReq({ body: VALID_BODY, headers: {} }));
    expect(res.status).toBe(200);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ userAgent: undefined })
    );
  });

  it("returns 403 for a bot user-agent", async () => {
    h.isBotUserAgent.mockReturnValue(true);
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(403);
    expect(h.rateLimitByIp).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 50 });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("50");
  });

  it("returns 400 on schema validation failure", async () => {
    const res = await POST(makeReq({ body: { ...VALID_BODY, email: "nope" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("valid email");
  });

  it("silently returns success when a non-honeypot layer fails (honeypot passed, math failed)", async () => {
    h.verifyBotDefense.mockResolvedValue({
      ok: false,
      checks: { honeypot: false, math: false, timeTrap: true, turnstile: true, turnstileSkipped: false },
    });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe("You're subscribed!");
    expect(h.upsert).not.toHaveBeenCalled();
  });

  it("returns 400 with reason on honeypot failure", async () => {
    h.verifyBotDefense.mockResolvedValue({
      ok: false,
      reason: "validation",
      checks: { honeypot: true, math: true, timeTrap: true, turnstile: true, turnstileSkipped: false },
    });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("validation");
  });

  it("returns 400 with default message when honeypot fails without a reason", async () => {
    h.verifyBotDefense.mockResolvedValue({
      ok: false,
      checks: { honeypot: true, math: true, timeTrap: true, turnstile: true, turnstileSkipped: false },
    });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Security check failed.");
  });

  it("swallows duplicate (P2002) upsert errors and still succeeds", async () => {
    h.upsert.mockRejectedValue({ code: "P2002" });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(h.writeAuditLog).toHaveBeenCalled();
  });

  it("returns 500 on a non-P2002 DB error", async () => {
    h.upsert.mockRejectedValue({ code: "P5000", message: "boom" });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Something went wrong");
    expect(h.writeAuditLog).not.toHaveBeenCalled();
  });
});

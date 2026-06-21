import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  issueMathCaptcha: vi.fn(() => ({ token: "math-token-xyz", problem: "7 + 3" })),
  issueTimeToken: vi.fn(() => ({ token: "time-token-xyz", minSeconds: 2 })),
  getTurnstileSiteKey: vi.fn(async () => "site-key-123"),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/bot-defense", () => ({
  issueMathCaptcha: h.issueMathCaptcha,
  issueTimeToken: h.issueTimeToken,
  getTurnstileSiteKey: h.getTurnstileSiteKey,
}));

import { GET } from "./route";

function makeReq({
  method = "GET",
  url = "http://localhost/api/captcha",
  headers = {},
}: { method?: string; url?: string; headers?: Record<string, string> } = {}) {
  return { method, url, headers: new Headers(headers) } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getTurnstileSiteKey.mockResolvedValue("site-key-123");
});

describe("GET /api/captcha", () => {
  it("issues a fresh math + time token and site key", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      mathToken: "math-token-xyz",
      problem: "7 + 3",
      timeToken: "time-token-xyz",
      minSeconds: 2,
      turnstileSiteKey: "site-key-123",
    });
    expect(h.rateLimitByIp).toHaveBeenCalledWith("1.2.3.4", "captcha-issue", 30, 60_000);
    expect(h.issueTimeToken).toHaveBeenCalledWith(2);
  });

  it("returns a null site key when Turnstile is not configured", async () => {
    h.getTurnstileSiteKey.mockResolvedValue(null);
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.turnstileSiteKey).toBeNull();
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 42 });
    const res = await GET(makeReq());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    expect((await res.json()).error).toBe("Too many requests");
    expect(h.issueMathCaptcha).not.toHaveBeenCalled();
  });
});

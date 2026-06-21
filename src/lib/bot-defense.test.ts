import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for src/lib/bot-defense.ts.
 *
 * Boundaries mocked:
 *  - @/lib/secrets       → getMasterKey (HMAC signing key) + isMasterKeyConfigured
 *  - @/lib/secrets-data  → getSecretValue (Turnstile secret/site key)
 *  - global fetch        → Cloudflare siteverify
 *
 * Real crypto is used so signed tokens round-trip. Fake timers drive the
 * time-trap + TTL expiry branches.
 */
const h = vi.hoisted(() => ({
  getMasterKey: vi.fn(() => Buffer.from("test-master-key-1234567890")),
  isMasterKeyConfigured: vi.fn(() => true),
  getSecretValue: vi.fn(),
}));

vi.mock("@/lib/secrets", () => ({
  getMasterKey: h.getMasterKey,
  isMasterKeyConfigured: h.isMasterKeyConfigured,
}));
vi.mock("@/lib/secrets-data", () => ({
  getSecretValue: h.getSecretValue,
}));

import {
  issueMathCaptcha,
  verifyMathCaptcha,
  issueTimeToken,
  verifyTimeToken,
  checkHoneypots,
  isBotUserAgent,
  verifyTurnstile,
  getTurnstileSiteKey,
  verifyBotDefense,
  HONEYPOT_FIELDS,
} from "./bot-defense";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  h.isMasterKeyConfigured.mockReturnValue(true);
  h.getMasterKey.mockReturnValue(Buffer.from("test-master-key-1234567890"));
  h.getSecretValue.mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("math captcha", () => {
  it("issues a token + problem and verifies the correct answer", () => {
    const { token, problem } = issueMathCaptcha();
    expect(token).toContain(".");
    const [aStr, op, bStr] = problem.split(" ");
    const a = Number(aStr);
    const b = Number(bStr);
    const answer = op === "+" ? a + b : a - b;
    expect(verifyMathCaptcha(token, answer)).toBe(true);
    expect(verifyMathCaptcha(token, String(answer))).toBe(true);
  });

  it("rejects a wrong answer", () => {
    const { token, problem } = issueMathCaptcha();
    const [a, op, b] = problem.split(" ");
    const correct = op === "+" ? Number(a) + Number(b) : Number(a) - Number(b);
    expect(verifyMathCaptcha(token, correct + 1)).toBe(false);
  });

  it("rejects a malformed token (no dot)", () => {
    expect(verifyMathCaptcha("nodot", 1)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const { token, problem } = issueMathCaptcha();
    const [a, op, b] = problem.split(" ");
    const correct = op === "+" ? Number(a) + Number(b) : Number(a) - Number(b);
    const [payload] = token.split(".");
    expect(verifyMathCaptcha(payload + ".badsignature", correct)).toBe(false);
  });

  it("rejects a non-numeric answer (NaN)", () => {
    const { token } = issueMathCaptcha();
    expect(verifyMathCaptcha(token, "abc")).toBe(false);
  });

  it("rejects when the token type is not 'math'", () => {
    // A correctly-signed time token should fail math verification
    const { token } = issueTimeToken();
    expect(verifyMathCaptcha(token, 0)).toBe(false);
  });

  it("rejects an expired token (past TTL)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { token, problem } = issueMathCaptcha();
    const [a, op, b] = problem.split(" ");
    const correct = op === "+" ? Number(a) + Number(b) : Number(a) - Number(b);
    vi.setSystemTime(11 * 60 * 1000); // > 10 min TTL
    expect(verifyMathCaptcha(token, correct)).toBe(false);
  });

  it("rejects when JSON payload is garbage (catch branch)", () => {
    // payloadB64 that is not valid JSON, but with any signature -> sig check
    // fails first; force the JSON.parse catch by signing garbage ourselves is
    // hard, so simply assert a totally broken token returns false.
    expect(verifyMathCaptcha("...", 1)).toBe(false);
  });

  it("returns false (catch) when token is not a string (.split throws)", () => {
    // @ts-expect-error — exercising the defensive try/catch
    expect(verifyMathCaptcha(null, 1)).toBe(false);
  });
});

describe("time token", () => {
  it("rejects submissions faster than minSeconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { token } = issueTimeToken(2);
    vi.setSystemTime(1000); // 1s elapsed < 2s
    const res = verifyTimeToken(token);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("too-fast");
  });

  it("accepts submissions after minSeconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { token, minSeconds } = issueTimeToken(2);
    expect(minSeconds).toBe(2);
    vi.setSystemTime(3000); // 3s elapsed
    expect(verifyTimeToken(token).ok).toBe(true);
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { token } = issueTimeToken(2);
    vi.setSystemTime(11 * 60 * 1000);
    const res = verifyTimeToken(token);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("expired");
  });

  it("rejects a malformed token", () => {
    expect(verifyTimeToken("nodot")).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects a bad signature", () => {
    const { token } = issueTimeToken();
    const [payload] = token.split(".");
    expect(verifyTimeToken(payload + ".bad")).toEqual({
      ok: false,
      reason: "bad-sig",
    });
  });

  it("rejects the wrong token type", () => {
    const { token } = issueMathCaptcha();
    expect(verifyTimeToken(token).reason).toBe("wrong-type");
  });

  it("returns the exception reason (catch) when token is not a string", () => {
    // @ts-expect-error — exercising the defensive try/catch
    expect(verifyTimeToken(null)).toEqual({ ok: false, reason: "exception" });
  });
});

describe("honeypots", () => {
  it("exports the honeypot field names", () => {
    expect(HONEYPOT_FIELDS).toEqual(["company", "website_url", "fax_number"]);
  });

  it("passes when all honeypots are empty/absent", () => {
    expect(checkHoneypots({})).toBe(false);
    expect(checkHoneypots({ company: "", website_url: null })).toBe(false);
  });

  it("detects a filled honeypot", () => {
    expect(checkHoneypots({ company: "Acme Inc" })).toBe(true);
    expect(checkHoneypots({ fax_number: "  123  " })).toBe(true);
  });
});

describe("isBotUserAgent", () => {
  it("treats a missing UA as suspicious", () => {
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent(undefined)).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
  });

  it("flags known bot UAs", () => {
    expect(isBotUserAgent("Googlebot/2.1")).toBe(true);
    expect(isBotUserAgent("curl/8.0")).toBe(true);
    expect(isBotUserAgent("python-requests/2.31")).toBe(true);
    expect(isBotUserAgent("HeadlessChrome")).toBe(true);
  });

  it("allows a normal browser UA", () => {
    expect(
      isBotUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/537.36 Safari/537.36"
      )
    ).toBe(false);
  });
});

describe("verifyTurnstile", () => {
  it("skips when master key is not configured", async () => {
    h.isMasterKeyConfigured.mockReturnValue(false);
    expect(await verifyTurnstile("tok", "1.2.3.4")).toEqual({
      ok: true,
      skipped: true,
    });
  });

  it("skips when no TURNSTILE_SECRET_KEY is set", async () => {
    h.getSecretValue.mockResolvedValue(null);
    expect(await verifyTurnstile("tok", null)).toEqual({
      ok: true,
      skipped: true,
    });
  });

  it("fails when token missing but secret is configured", async () => {
    h.getSecretValue.mockResolvedValue("secret");
    const res = await verifyTurnstile(undefined, null);
    expect(res).toEqual({
      ok: false,
      skipped: false,
      error: "Missing Turnstile token",
    });
  });

  it("returns ok when Cloudflare reports success (with ip)", async () => {
    h.getSecretValue.mockResolvedValue("secret");
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await verifyTurnstile("tok", "9.9.9.9");
    expect(res.ok).toBe(true);
    expect(res.skipped).toBe(false);
    expect(res.error).toBeUndefined();
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("remoteip")).toBe("9.9.9.9");
    expect(body.get("response")).toBe("tok");
  });

  it("returns not-ok with error codes when Cloudflare reports failure (no ip)", async () => {
    h.getSecretValue.mockResolvedValue("secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ success: false, "error-codes": ["invalid-input"] }),
      })
    );
    const res = await verifyTurnstile("tok", null);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("invalid-input");
  });

  it("uses an empty error-codes array when Cloudflare omits the field", async () => {
    h.getSecretValue.mockResolvedValue("secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ success: false }) })
    );
    const res = await verifyTurnstile("tok", null);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("[]");
  });

  it("handles a fetch exception", async () => {
    h.getSecretValue.mockResolvedValue("secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const res = await verifyTurnstile("tok", null);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("network down");
  });

  it("uses fallback error message when exception has no message", async () => {
    h.getSecretValue.mockResolvedValue("secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue({}));
    const res = await verifyTurnstile("tok", null);
    expect(res.error).toBe("Turnstile verify failed");
  });
});

describe("getTurnstileSiteKey", () => {
  it("returns null when master key not configured", async () => {
    h.isMasterKeyConfigured.mockReturnValue(false);
    expect(await getTurnstileSiteKey()).toBeNull();
  });

  it("returns the site key from the vault", async () => {
    h.getSecretValue.mockResolvedValue("site-key-123");
    expect(await getTurnstileSiteKey()).toBe("site-key-123");
  });
});

describe("verifyBotDefense (combined)", () => {
  function freshTokens(minSeconds = 2) {
    const math = issueMathCaptcha();
    const [a, op, b] = math.problem.split(" ");
    const mathAnswer = op === "+" ? Number(a) + Number(b) : Number(a) - Number(b);
    const time = issueTimeToken(minSeconds);
    return { mathToken: math.token, mathAnswer, timeToken: time.token };
  }

  it("rejects when a honeypot is filled", async () => {
    const res = await verifyBotDefense({ honeypots: { company: "bot" } });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("validation");
    expect(res.checks.honeypot).toBe(false);
  });

  it("rejects when the math captcha is missing/wrong", async () => {
    const res = await verifyBotDefense({ honeypots: {} });
    expect(res.ok).toBe(false);
    expect(res.checks.math).toBe(false);
  });

  it("treats a present token with an undefined answer as empty string", async () => {
    const { token } = issueMathCaptcha();
    // mathAnswer omitted -> the `?? ""` fallback is exercised
    const res = await verifyBotDefense({ mathToken: token, honeypots: {} });
    expect(res.ok).toBe(false);
    expect(res.checks.math).toBe(false);
  });

  it("rejects when the time token is missing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { mathToken, mathAnswer } = freshTokens();
    const res = await verifyBotDefense({ mathToken, mathAnswer, honeypots: {} });
    expect(res.ok).toBe(false);
    expect(res.checks.timeTrap).toBe(false);
  });

  it("rejects when submitted too fast (time trap)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { mathToken, mathAnswer, timeToken } = freshTokens(5);
    vi.setSystemTime(1000); // 1s < 5s
    const res = await verifyBotDefense({
      mathToken,
      mathAnswer,
      timeToken,
      honeypots: {},
    });
    expect(res.ok).toBe(false);
    expect(res.checks.timeTrap).toBe(false);
  });

  it("passes all layers with Turnstile skipped (not configured)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { mathToken, mathAnswer, timeToken } = freshTokens(2);
    vi.setSystemTime(3000);
    h.getSecretValue.mockResolvedValue(null); // turnstile skipped
    const res = await verifyBotDefense({
      mathToken,
      mathAnswer,
      timeToken,
      honeypots: {},
    });
    expect(res.ok).toBe(true);
    expect(res.checks.turnstileSkipped).toBe(true);
  });

  it("blocks when requireTurnstile=true and Turnstile fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { mathToken, mathAnswer, timeToken } = freshTokens(2);
    vi.setSystemTime(3000);
    h.getSecretValue.mockResolvedValue("secret"); // turnstile enforced
    const res = await verifyBotDefense(
      { mathToken, mathAnswer, timeToken, honeypots: {} }, // no turnstileToken -> missing
      { requireTurnstile: true, ip: "1.1.1.1" }
    );
    expect(res.ok).toBe(false);
    expect(res.checks.turnstile).toBe(false);
  });

  it("logs but does not block when Turnstile fails and is not required", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { mathToken, mathAnswer, timeToken } = freshTokens(2);
    vi.setSystemTime(3000);
    h.getSecretValue.mockResolvedValue("secret");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await verifyBotDefense({
      mathToken,
      mathAnswer,
      timeToken,
      honeypots: {},
    });
    expect(res.ok).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

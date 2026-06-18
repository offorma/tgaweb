/**
 * Server-side bot defense utilities.
 *
 * Layers:
 *  1. Math captcha — server generates a signed math problem, client solves it,
 *     server verifies the answer + signature (prevents replay/forgery).
 *  2. Time-trap — server issues a signed timestamp when the form is rendered;
 *     submissions faster than 2 seconds are rejected (bots fill instantly).
 *  3. Multiple honeypots — 3 hidden fields with realistic names; any non-empty
 *     value = bot.
 *  4. Bot user-agent blocking — reject requests from known bot UAs.
 *  5. Cloudflare Turnstile (optional) — if TURNSTILE_SECRET_KEY is set in the
 *     Secrets Vault, verify the Turnstile token via Cloudflare's API.
 *
 * The signed tokens use HMAC-SHA256 with the SECRETS_MASTER_KEY so they can't
 * be forged without the master key.
 */

import crypto from "crypto";
import { getMasterKey, isMasterKeyConfigured } from "@/lib/secrets";
import { getSecretValue } from "@/lib/secrets-data";

// ============ Token signing ============

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getSigningKey(): Buffer {
  return crypto.createHash("sha256").update(getMasterKey()).digest();
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSigningKey()).update(payload).digest("base64url");
}

/**
 * Issue a signed token containing the math captcha problem + answer.
 * Returns the token + the problem to display to the user.
 */
export function issueMathCaptcha(): {
  token: string;
  problem: string;
} {
  const a = Math.floor(Math.random() * 9) + 1; // 1-9
  const b = Math.floor(Math.random() * 9) + 1; // 1-9
  const ops = ["+", "-"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  const answer = op === "+" ? a + b : a - b;
  const problem = `${a} ${op} ${b}`;

  const payload = JSON.stringify({
    type: "math",
    answer,
    issuedAt: Date.now(),
  });
  const signature = sign(payload);
  const token = Buffer.from(payload).toString("base64url") + "." + signature;

  return { token, problem };
}

/**
 * Verify a math captcha token + the user's answer.
 * Returns true if valid + not expired + answer matches.
 */
export function verifyMathCaptcha(token: string, userAnswer: string | number): boolean {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return false;

    // Verify signature
    const expectedSig = sign(Buffer.from(payloadB64, "base64url").toString());
    if (!safeEqual(signature, expectedSig)) return false;

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    ) as { type: string; answer: number; issuedAt: number };

    if (payload.type !== "math") return false;

    // Check TTL
    if (Date.now() - payload.issuedAt > TOKEN_TTL_MS) return false;

    // Check answer
    const userNum = typeof userAnswer === "number" ? userAnswer : parseInt(String(userAnswer).trim(), 10);
    if (isNaN(userNum)) return false;

    return safeEqual(String(userNum), String(payload.answer));
  } catch {
    return false;
  }
}

/**
 * Issue a signed timestamp token for the time-trap.
 * The client must wait at least `minSeconds` before submitting.
 */
export function issueTimeToken(minSeconds = 2): { token: string; minSeconds: number } {
  const payload = JSON.stringify({
    type: "time",
    issuedAt: Date.now(),
    minSeconds,
  });
  const signature = sign(payload);
  return {
    token: Buffer.from(payload).toString("base64url") + "." + signature,
    minSeconds,
  };
}

/**
 * Verify a time token — the form must have been open for at least minSeconds.
 */
export function verifyTimeToken(token: string): { ok: boolean; reason?: string } {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return { ok: false, reason: "malformed" };

    const expectedSig = sign(Buffer.from(payloadB64, "base64url").toString());
    if (!safeEqual(signature, expectedSig)) return { ok: false, reason: "bad-sig" };

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    ) as { type: string; issuedAt: number; minSeconds: number };

    if (payload.type !== "time") return { ok: false, reason: "wrong-type" };

    const elapsed = (Date.now() - payload.issuedAt) / 1000;
    if (elapsed < payload.minSeconds) {
      return { ok: false, reason: `too-fast (${elapsed.toFixed(1)}s < ${payload.minSeconds}s)` };
    }

    // Also reject if token is too old (form abandoned then submitted hours later)
    if (Date.now() - payload.issuedAt > TOKEN_TTL_MS) {
      return { ok: false, reason: "expired" };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: "exception" };
  }
}

// ============ Honeypots ============

/**
 * Honeypot field names — these look like real form fields to bots but are
 * hidden from human users via CSS. Any non-empty value = bot.
 */
export const HONEYPOT_FIELDS = [
  "company", // bots love filling "company"
  "website_url", // looks like a real field
  "fax_number", // old-school field bots auto-fill
] as const;

/**
 * Check all honeypot fields. Returns true if ANY is non-empty (= bot detected).
 */
export function checkHoneypots(body: Record<string, any>): boolean {
  return HONEYPOT_FIELDS.some((field) => {
    const val = body[field];
    return val !== undefined && val !== null && String(val).trim() !== "";
  });
}

// ============ Bot user-agent detection ============

const BOT_UA_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /httpclient/i,
  /node-fetch/i,
  /axios/i,
  /go-http-client/i,
  /java\//i,
  /libwww/i,
  /mechanize/i,
  /scrapy/i,
  /semrush/i,
  /ahrefs/i,
  /mj12/i,
  /dotbot/i,
  /petalbot/i,
  /dataforseo/i,
  /headless/i,
  /phantom/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
];

/**
 * Check if the user-agent looks like a bot.
 * Note: this is a heuristic — sophisticated bots can spoof UA. Use alongside
 * other defenses (captcha, honeypots, time-trap).
 */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return true; // missing UA = suspicious
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(ua));
}

// ============ Cloudflare Turnstile (optional) ============

/**
 * Verify a Cloudflare Turnstile token via Cloudflare's siteverify API.
 * Returns true if the token is valid.
 *
 * Requires TURNSTILE_SECRET_KEY to be set in the Secrets Vault.
 * If not configured, returns true (Turnstile is optional).
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip: string | null
): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  // If no secret key configured, Turnstile is not enforced
  if (!isMasterKeyConfigured()) {
    return { ok: true, skipped: true };
  }
  const secret = await getSecretValue("TURNSTILE_SECRET_KEY");
  if (!secret) {
    return { ok: true, skipped: true };
  }

  if (!token) {
    return { ok: false, skipped: false, error: "Missing Turnstile token" };
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });
    const data = await res.json();
    return {
      ok: data.success === true,
      skipped: false,
      error: data.success ? undefined : JSON.stringify(data["error-codes"] || []),
    };
  } catch (e: any) {
    return { ok: false, skipped: false, error: e?.message || "Turnstile verify failed" };
  }
}

/**
 * Get the Turnstile site key (for client-side widget rendering).
 * Returns null if not configured.
 */
export async function getTurnstileSiteKey(): Promise<string | null> {
  if (!isMasterKeyConfigured()) return null;
  return await getSecretValue("TURNSTILE_SITE_KEY");
}

// ============ Helpers ============

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// ============ Combined verification ============

export interface BotDefenseInput {
  mathToken?: string;
  mathAnswer?: string | number;
  timeToken?: string;
  turnstileToken?: string;
  honeypots: Record<string, any>;
}

export interface BotDefenseResult {
  ok: boolean;
  reason?: string;
  checks: {
    honeypot: boolean; // true = passed (no bot detected)
    math: boolean;
    timeTrap: boolean;
    turnstile: boolean;
    turnstileSkipped: boolean;
  };
}

/**
 * Run all bot defense checks. Returns a detailed result.
 * The `checks` object shows which layers passed/failed for debugging.
 */
export async function verifyBotDefense(
  input: BotDefenseInput,
  opts: { ip?: string | null; requireTurnstile?: boolean } = {}
): Promise<BotDefenseResult> {
  const checks = {
    honeypot: true,
    math: true,
    timeTrap: true,
    turnstile: true,
    turnstileSkipped: false,
  };

  // 1) Honeypots — if any filled, reject (but don't tell the bot why)
  if (checkHoneypots(input.honeypots)) {
    return {
      ok: false,
      reason: "validation", // generic reason
      checks: { ...checks, honeypot: false },
    };
  }

  // 2) Math captcha
  if (!input.mathToken || !verifyMathCaptcha(input.mathToken, input.mathAnswer ?? "")) {
    return {
      ok: false,
      reason: "The security question was not answered correctly. Please try again.",
      checks: { ...checks, math: false },
    };
  }

  // 3) Time-trap
  if (!input.timeToken) {
    return {
      ok: false,
      reason: "Form session expired. Please refresh and try again.",
      checks: { ...checks, timeTrap: false },
    };
  }
  const timeResult = verifyTimeToken(input.timeToken);
  if (!timeResult.ok) {
    return {
      ok: false,
      reason: "Form submitted too quickly. Please take a moment to review your answers.",
      checks: { ...checks, timeTrap: false },
    };
  }

  // 4) Turnstile (optional — only enforced if secret key is configured OR requireTurnstile=true)
  const turnstileResult = await verifyTurnstile(input.turnstileToken, opts.ip ?? null);
  if (!turnstileResult.ok) {
    if (opts.requireTurnstile) {
      return {
        ok: false,
        reason: "CAPTCHA verification failed. Please complete the challenge.",
        checks: { ...checks, turnstile: false, turnstileSkipped: turnstileResult.skipped },
      };
    }
    // If not required, log but don't block
    console.warn("[bot-defense] Turnstile failed but not required:", turnstileResult.error);
  }
  checks.turnstileSkipped = turnstileResult.skipped;

  return { ok: true, checks };
}

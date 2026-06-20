import { NextResponse } from "next/server";
import { rateLimitByIp, getClientIp } from "@/lib/rate-limit";
import { issueMathCaptcha, issueTimeToken, getTurnstileSiteKey } from "@/lib/bot-defense";

export const dynamic = "force-dynamic";

/**
 * GET /api/captcha
 * Issues a fresh math captcha + time-trap token for a form.
 *
 * Rate limited: 30 requests per minute per IP (enough for legitimate form loads).
 *
 * Returns:
 *   - mathToken: signed token containing the answer (server verifies later)
 *   - problem: the math problem to display (e.g. "7 + 3")
 *   - timeToken: signed timestamp token (form must wait ≥2s before submitting)
 *   - turnstileSiteKey: Cloudflare Turnstile site key (null if not configured)
 */
export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimitByIp(ip, "captcha-issue", 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const math = issueMathCaptcha();
  const time = issueTimeToken(2);
  const turnstileSiteKey = await getTurnstileSiteKey();

  return NextResponse.json({
    mathToken: math.token,
    problem: math.problem,
    timeToken: time.token,
    minSeconds: time.minSeconds,
    turnstileSiteKey,
  });
}

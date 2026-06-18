/**
 * In-memory rate limiter for API endpoints.
 * Tracks request counts per IP+route key. Resets every window.
 * Note: in-memory only — sufficient for single-instance deployments.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const CLEANUP_INTERVAL = 60_000;

// Periodically purge expired buckets to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}, CLEANUP_INTERVAL);

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds
}

export function rateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(opts.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(opts.key, {
      count: 1,
      resetAt: now + opts.windowMs,
    });
    return { ok: true, remaining: opts.limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, opts.limit - existing.count);
  const retryAfter = Math.ceil((existing.resetAt - now) / 1000);

  return {
    ok: existing.count <= opts.limit,
    remaining,
    retryAfter,
  };
}

/**
 * Convenience: rate limit by IP for a given route namespace.
 * Default: 60 requests per minute per IP.
 */
export function rateLimitByIp(
  ip: string | null,
  namespace: string,
  limit = 60,
  windowMs = 60_000
): RateLimitResult {
  const safeIp = ip || "unknown";
  return rateLimit({
    key: `${namespace}:${safeIp}`,
    limit,
    windowMs,
  });
}

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

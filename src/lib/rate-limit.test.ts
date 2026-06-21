import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Backend unit tests for src/lib/rate-limit.ts.
 *
 * The limiter is in-memory and time-based. We use fake timers to drive the
 * window-expiry / reset logic and the periodic cleanup interval deterministically.
 * Each test imports a fresh module so the internal `buckets` Map starts empty.
 */

async function freshModule() {
  vi.resetModules();
  return import("@/lib/rate-limit");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-21T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit()", () => {
  it("allows the first request and decrements remaining", async () => {
    const { rateLimit } = await freshModule();
    const r = rateLimit({ key: "k", limit: 3, windowMs: 1000 });
    expect(r).toEqual({ ok: true, remaining: 2, retryAfter: 0 });
  });

  it("counts subsequent requests within the same window", async () => {
    const { rateLimit } = await freshModule();
    rateLimit({ key: "k", limit: 3, windowMs: 1000 });
    const r2 = rateLimit({ key: "k", limit: 3, windowMs: 1000 });
    expect(r2.ok).toBe(true);
    expect(r2.remaining).toBe(1);
    // 1000ms remaining → ceil(1000/1000) = 1
    expect(r2.retryAfter).toBe(1);
  });

  it("blocks once the limit is exceeded and reports remaining 0", async () => {
    const { rateLimit } = await freshModule();
    rateLimit({ key: "k", limit: 2, windowMs: 5000 });
    rateLimit({ key: "k", limit: 2, windowMs: 5000 }); // count 2 → still ok (<=limit)
    const r3 = rateLimit({ key: "k", limit: 2, windowMs: 5000 }); // count 3 → blocked
    expect(r3.ok).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.retryAfter).toBe(5);
  });

  it("allows exactly `limit` requests (boundary: count === limit is ok)", async () => {
    const { rateLimit } = await freshModule();
    let last;
    for (let i = 0; i < 4; i++) {
      last = rateLimit({ key: "b", limit: 4, windowMs: 1000 });
    }
    expect(last!.ok).toBe(true);
    expect(last!.remaining).toBe(0);
  });

  it("resets after the window has elapsed", async () => {
    const { rateLimit } = await freshModule();
    rateLimit({ key: "k", limit: 1, windowMs: 1000 });
    const blocked = rateLimit({ key: "k", limit: 1, windowMs: 1000 });
    expect(blocked.ok).toBe(false);

    // advance past resetAt
    vi.advanceTimersByTime(1001);
    const reset = rateLimit({ key: "k", limit: 1, windowMs: 1000 });
    expect(reset.ok).toBe(true);
    expect(reset.remaining).toBe(0);
  });

  it("treats resetAt <= now as expired (boundary)", async () => {
    const { rateLimit } = await freshModule();
    rateLimit({ key: "k", limit: 5, windowMs: 1000 });
    // exactly at resetAt → existing.resetAt <= now true → new window
    vi.advanceTimersByTime(1000);
    const r = rateLimit({ key: "k", limit: 5, windowMs: 1000 });
    expect(r.remaining).toBe(4);
  });

  it("keeps separate buckets per key", async () => {
    const { rateLimit } = await freshModule();
    rateLimit({ key: "a", limit: 1, windowMs: 1000 });
    const b = rateLimit({ key: "b", limit: 1, windowMs: 1000 });
    expect(b.ok).toBe(true);
  });

  it("purges expired buckets on the cleanup interval", async () => {
    const { rateLimit } = await freshModule();
    rateLimit({ key: "k", limit: 1, windowMs: 1000 });
    const blocked = rateLimit({ key: "k", limit: 1, windowMs: 1000 });
    expect(blocked.ok).toBe(false);

    // advance past the window AND trigger the 60s cleanup interval
    vi.advanceTimersByTime(60_000);

    // bucket should have been purged → fresh window, full allowance
    const r = rateLimit({ key: "k", limit: 1, windowMs: 1000 });
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(0);
  });

  it("cleanup keeps still-active buckets", async () => {
    const { rateLimit } = await freshModule();
    // long window so the bucket survives the first cleanup tick
    rateLimit({ key: "k", limit: 2, windowMs: 120_000 });
    vi.advanceTimersByTime(60_000); // cleanup fires; bucket NOT expired (resetAt 120s)
    const r = rateLimit({ key: "k", limit: 2, windowMs: 120_000 });
    expect(r.remaining).toBe(0); // count is now 2, so the bucket persisted
  });
});

describe("rateLimitByIp()", () => {
  it("uses the namespace:ip key", async () => {
    const { rateLimitByIp, rateLimit } = await freshModule();
    rateLimitByIp("1.2.3.4", "login");
    // same composite key should now have a count
    const r = rateLimit({ key: "login:1.2.3.4", limit: 60, windowMs: 60_000 });
    expect(r.remaining).toBe(58);
  });

  it("falls back to 'unknown' when ip is null", async () => {
    const { rateLimitByIp, rateLimit } = await freshModule();
    rateLimitByIp(null, "login");
    const r = rateLimit({ key: "login:unknown", limit: 60, windowMs: 60_000 });
    expect(r.remaining).toBe(58);
  });

  it("honors custom limit and window", async () => {
    const { rateLimitByIp } = await freshModule();
    const r = rateLimitByIp("9.9.9.9", "api", 2, 10_000);
    expect(r.remaining).toBe(1);
  });
});

describe("getClientIp()", () => {
  it("returns the first IP from x-forwarded-for", async () => {
    const { getClientIp } = await freshModule();
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": " 10.0.0.1 , 10.0.0.2" },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip", async () => {
    const { getClientIp } = await freshModule();
    const req = new Request("http://x", {
      headers: { "x-real-ip": " 5.6.7.8 " },
    });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("returns null when no ip headers present", async () => {
    const { getClientIp } = await freshModule();
    const req = new Request("http://x");
    expect(getClientIp(req)).toBeNull();
  });
});

import "server-only";

/**
 * Minimal fixed-window rate limiter backed by an in-process Map.
 * This is fine for a single instance. Swap for a shared store (Redis/Upstash)
 * before scaling horizontally — see RATES in src/lib/constants.ts.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so the Map does not grow without bound.
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  sweep(now);
  const existing = buckets.get(key);
  const resetAt = existing && existing.resetAt > now ? existing.resetAt : now + windowMs;
  const count = existing && existing.resetAt > now ? existing.count + 1 : 1;
  buckets.set(key, { count, resetAt });
  const ok = count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - count),
    limit,
    retryAfterSeconds: Math.max(0, Math.ceil((resetAt - now) / 1000)),
  };
}

export function clearRateLimits() {
  buckets.clear();
}

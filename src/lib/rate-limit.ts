// Simple in-memory sliding-window rate limiter.
//
// LIMITATION (documented, not hidden): this is per-process, in-memory state.
// It resets on every deploy/restart and does NOT share state across
// multiple app replicas. That is an accepted tradeoff for this project's
// deployment shape — a single self-hosted Docker Compose `app` container,
// per docker-compose.yml. If this is ever horizontally scaled to multiple
// app containers, this must move to a shared store (e.g. Redis) or the
// limit becomes N-times looser than configured.

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so `buckets` doesn't grow unbounded under a
// long-running process with many distinct IPs.
const MAX_TRACKED_KEYS = 5000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Fixed-window limiter: allows up to `limit` calls per `windowMs` per key.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_TRACKED_KEYS) {
    buckets.forEach((b, k) => {
      if (now - b.windowStart > windowMs) buckets.delete(k);
    });
  }

  const existing = buckets.get(key);
  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.ceil(
      (windowMs - (now - existing.windowStart)) / 1000,
    );
    return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP extraction behind a reverse proxy. Falls back to a
 * constant key if nothing is present (e.g. local testing without a proxy),
 * which degrades to a single shared bucket rather than no limiting. */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

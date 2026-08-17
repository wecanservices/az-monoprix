import "server-only";

/**
 * In-memory token-bucket rate limiter. Suitable for a single Node
 * instance and for dev. In production behind multiple pods, replace
 * with a Redis / Upstash counter — same interface.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function limitByKey(
  key: string,
  max = 60,
  windowMs = 60_000,
): { ok: true; remaining: number } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  if (entry.count >= max) {
    return { ok: false, retryAfterMs: entry.reset - now };
  }
  entry.count += 1;
  return { ok: true, remaining: max - entry.count };
}

export function limitByIp(
  ip: string | null,
  route: string,
  max = 60,
  windowMs = 60_000,
) {
  return limitByKey(`${ip ?? "anon"}:${route}`, max, windowMs);
}

/** Extract a best-effort client IP from a Next request. */
export function ipFromRequest(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anon"
  );
}

/**
 * Fixed-window rate limiting (Phase 19 / BE-11). In-memory, per-process —
 * consistent with the rest of V1's single-Node-process model (the build
 * scheduler and workspace store make the same assumption).
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the current window resets — the `Retry-After` hint. */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  /** Records one request for `key` and reports whether it's under the
   * limit. The nth request within a window that exceeds `limit` is the
   * first one rejected — every request still increments the counter, so a
   * caller that ignores a rejection doesn't get a second free attempt. */
  check(key: string): RateLimitResult;
}

interface Window {
  count: number;
  resetAt: number;
}

export function createRateLimiter(
  limit: number,
  windowMs: number,
  now: () => number = Date.now,
): RateLimiter {
  const windows = new Map<string, Window>();

  return {
    check(key: string): RateLimitResult {
      const t = now();
      let window = windows.get(key);
      if (!window || window.resetAt <= t) {
        window = { count: 0, resetAt: t + windowMs };
        windows.set(key, window);
      }
      window.count += 1;
      const retryAfterSeconds = Math.max(
        0,
        Math.ceil((window.resetAt - t) / 1000),
      );
      return { allowed: window.count <= limit, retryAfterSeconds };
    },
  };
}

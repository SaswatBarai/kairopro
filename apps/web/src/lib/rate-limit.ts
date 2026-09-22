import { createRateLimiter, RateLimitedError } from "@kairopro/core";

/**
 * Rate limiting for the generation, build, and deploy endpoints (Phase 19 /
 * BE-11). One limiter per category, keyed by the caller's org — a single
 * misbehaving org can't starve every other tenant, and a limit tuned for
 * "generation" doesn't also throttle "deploy".
 */

const generationLimiter = createRateLimiter(10, 60_000);
const buildLimiter = createRateLimiter(5, 60_000);
const deployLimiter = createRateLimiter(3, 60_000);

const LIMITERS = {
  generation: generationLimiter,
  build: buildLimiter,
  deploy: deployLimiter,
} as const;

export type RateLimitCategory = keyof typeof LIMITERS;

/** Throws `RateLimitedError` (mapped to a 429 with `Retry-After` by
 * `toErrorResponse`) once `orgId` exceeds the category's limit. */
export function enforceRateLimit(
  category: RateLimitCategory,
  orgId: string,
): void {
  const result = LIMITERS[category].check(orgId);
  if (!result.allowed) {
    throw new RateLimitedError({
      message: "Too many requests. Please slow down and try again.",
      details: { retryAfterSeconds: result.retryAfterSeconds },
    });
  }
}

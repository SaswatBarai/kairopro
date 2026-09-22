import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./limiter";

describe("createRateLimiter", () => {
  it("allows up to the limit within a window", () => {
    const limiter = createRateLimiter(3, 1000, () => 0);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("rejects the nth request in a window", () => {
    const limiter = createRateLimiter(2, 1000, () => 0);
    limiter.check("a");
    limiter.check("a");
    const third = limiter.check("a");
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter(1, 1000, () => 0);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("resets after the window elapses", () => {
    let t = 0;
    const limiter = createRateLimiter(1, 1000, () => t);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    t = 1001;
    expect(limiter.check("a").allowed).toBe(true);
  });
});

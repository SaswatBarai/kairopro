import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, ValidationError } from "../../lib/errors";
import { IntervalScheduler } from "./scheduler";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("IntervalScheduler", () => {
  it("runs a job on its interval", async () => {
    const s = new IntervalScheduler();
    const job = vi.fn();
    s.register("usage-sweeper", 100, job);

    await vi.advanceTimersByTimeAsync(350);
    expect(job).toHaveBeenCalledTimes(3);

    s.cancelAll();
  });

  it("skips a tick while the previous run is still in flight", async () => {
    const s = new IntervalScheduler();
    let release: (() => void) | undefined;
    const job = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    s.register("slow-job", 100, job);

    await vi.advanceTimersByTimeAsync(100); // first run starts, still in flight
    expect(job).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(200); // two ticks fire — both skipped
    expect(job).toHaveBeenCalledTimes(1);

    release?.();
    await vi.advanceTimersByTimeAsync(100); // next tick runs again
    expect(job).toHaveBeenCalledTimes(2);

    s.cancelAll();
  });

  it("cancel stops delivery and returns whether the id was registered", async () => {
    const s = new IntervalScheduler();
    const job = vi.fn();
    s.register("job", 100, job);

    expect(s.cancel("job")).toBe(true);
    expect(s.cancel("job")).toBe(false);

    await vi.advanceTimersByTimeAsync(500);
    expect(job).not.toHaveBeenCalled();
  });

  it("cancelAll stops every job", async () => {
    const s = new IntervalScheduler();
    const a = vi.fn();
    const b = vi.fn();
    s.register("a", 100, a);
    s.register("b", 100, b);

    s.cancelAll();
    await vi.advanceTimersByTimeAsync(500);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();

    // The scheduler is stopped — registration after cancelAll is refused.
    expect(() => s.register("c", 100, vi.fn())).toThrow(ConflictError);
  });

  it("rejects duplicate ids and invalid intervals", () => {
    const s = new IntervalScheduler();
    s.register("job", 100, vi.fn());
    expect(() => s.register("job", 100, vi.fn())).toThrow(ConflictError);
    expect(() => s.register("other", 0, vi.fn())).toThrow(ValidationError);
    expect(() => s.register("other", -5, vi.fn())).toThrow(ValidationError);
    expect(() => s.register("other", 1.5, vi.fn())).toThrow(ValidationError);
  });
});

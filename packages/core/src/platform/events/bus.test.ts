import { describe, expect, it, vi } from "vitest";
import { LocalEventBus } from "./bus";
import type { BuildEvent } from "./bus";

function buildEvent(overrides: Partial<BuildEvent> = {}): BuildEvent {
  return {
    buildId: "bld_taskflow_7",
    seq: 0,
    type: "STEP",
    content: "Starting build",
    createdAt: "2026-09-13T10:00:00.000Z",
    ...overrides,
  };
}

describe("LocalEventBus", () => {
  it("delivers a published event to every subscriber of that channel", () => {
    const bus = new LocalEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe("build:bld_1", a);
    bus.subscribe("build:bld_1", b);
    const other = vi.fn();
    bus.subscribe("build:bld_2", other);

    const event = buildEvent({ buildId: "bld_1", seq: 3 });
    bus.publish("build:bld_1", event);

    expect(a).toHaveBeenCalledExactlyOnceWith(event);
    expect(b).toHaveBeenCalledExactlyOnceWith(event);
    expect(other).not.toHaveBeenCalled();
  });

  it("unsubscribe stops delivery and cleans up the channel", () => {
    const bus = new LocalEventBus();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe("build:bld_1", handler);

    unsubscribe();
    expect(bus.subscriberCount("build:bld_1")).toBe(0);

    bus.publish("build:bld_1", buildEvent());
    expect(handler).not.toHaveBeenCalled();

    // Idempotent — a second call is a no-op.
    expect(() => unsubscribe()).not.toThrow();
  });

  it("a failing subscriber does not break the others, nor the publisher", () => {
    const bus = new LocalEventBus();
    const broken = vi.fn(() => {
      throw new Error("subscriber bug");
    });
    const healthy = vi.fn();
    bus.subscribe("build:bld_1", broken);
    bus.subscribe("build:bld_1", healthy);

    expect(() => bus.publish("build:bld_1", buildEvent())).not.toThrow();
    expect(broken).toHaveBeenCalledTimes(1);
    expect(healthy).toHaveBeenCalledExactlyOnceWith(buildEvent());
  });

  it("a handler that unsubscribes itself during delivery is safe", () => {
    const bus = new LocalEventBus();
    const late = vi.fn();
    let unsubscribe: () => void = () => {};
    const first = vi.fn(() => {
      unsubscribe();
    });
    unsubscribe = bus.subscribe("build:bld_1", first);
    bus.subscribe("build:bld_1", late);

    expect(() => bus.publish("build:bld_1", buildEvent())).not.toThrow();
    expect(first).toHaveBeenCalledTimes(1);
    expect(late).toHaveBeenCalledTimes(1);
  });
});

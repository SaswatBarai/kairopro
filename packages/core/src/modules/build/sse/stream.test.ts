import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listLogsSinceMock = vi.fn();
vi.mock("../logs", () => ({
  listLogsSince: (...args: unknown[]) => listLogsSinceMock(...args),
}));

import { eventBus } from "../../../platform/events";
import { streamBuildEvents } from "./stream";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

function logRow(seq: number, content = "{}") {
  return {
    id: `l${seq}`,
    buildId: "b1",
    seq,
    type: "STEP" as const,
    content,
    createdAt: new Date(),
  };
}

describe("streamBuildEvents (BE-10)", () => {
  it("replays the backlog first, then live events, in seq order", async () => {
    listLogsSinceMock.mockResolvedValue([logRow(0), logRow(1)]);

    const controller = new AbortController();
    const gen = streamBuildEvents({
      buildId: "b1",
      lastEventSeq: -1,
      signal: controller.signal,
      keepaliveIntervalMs: 1_000_000,
    });

    expect((await gen.next()).value).toContain("id: 0");
    expect((await gen.next()).value).toContain("id: 1");

    const nextPromise = gen.next();
    eventBus.publish("build:b1", {
      buildId: "b1",
      seq: 2,
      type: "STDOUT",
      content: "live",
      createdAt: new Date().toISOString(),
    });
    expect((await nextPromise).value).toContain("id: 2");

    controller.abort();
    await gen.return(undefined);
  });

  it("de-dupes a live event whose seq the backlog already covered", async () => {
    listLogsSinceMock.mockResolvedValue([logRow(0)]);
    const controller = new AbortController();
    const gen = streamBuildEvents({
      buildId: "b1",
      lastEventSeq: -1,
      signal: controller.signal,
      keepaliveIntervalMs: 1_000_000,
    });

    await gen.next(); // backlog frame for seq 0

    const nextPromise = gen.next();
    eventBus.publish("build:b1", {
      buildId: "b1",
      seq: 0,
      type: "STEP",
      content: "{}",
      createdAt: new Date().toISOString(),
    }); // duplicate — must be skipped
    eventBus.publish("build:b1", {
      buildId: "b1",
      seq: 1,
      type: "STEP",
      content: "{}",
      createdAt: new Date().toISOString(),
    });
    expect((await nextPromise).value).toContain("id: 1");

    controller.abort();
    await gen.return(undefined);
  });

  it("delivers an event published during the backlog query exactly once (gap-free reconnect)", async () => {
    let resolveBacklog!: (rows: unknown[]) => void;
    listLogsSinceMock.mockReturnValue(
      new Promise((resolve) => {
        resolveBacklog = resolve;
      }),
    );

    const controller = new AbortController();
    const gen = streamBuildEvents({
      buildId: "b1",
      lastEventSeq: -1,
      signal: controller.signal,
      keepaliveIntervalMs: 1_000_000,
    });

    const framePromise = gen.next();
    // Let the generator reach `await listLogsSince(...)` — it subscribes
    // before that call, so this event lands in its live queue.
    await Promise.resolve();
    await Promise.resolve();
    eventBus.publish("build:b1", {
      buildId: "b1",
      seq: 0,
      type: "STEP",
      content: "{}",
      createdAt: new Date().toISOString(),
    });
    resolveBacklog([]); // backlog itself came back empty

    expect((await framePromise).value).toContain("id: 0");

    controller.abort();
    await gen.return(undefined);
  });

  it("stops when the signal is aborted", async () => {
    listLogsSinceMock.mockResolvedValue([]);
    const controller = new AbortController();
    const gen = streamBuildEvents({
      buildId: "b1",
      lastEventSeq: -1,
      signal: controller.signal,
      keepaliveIntervalMs: 1_000_000,
    });

    const donePromise = gen.next();
    controller.abort();
    expect((await donePromise).done).toBe(true);
  });

  it("emits a keepalive comment when idle past the interval", async () => {
    vi.useFakeTimers();
    listLogsSinceMock.mockResolvedValue([]);
    const controller = new AbortController();
    const gen = streamBuildEvents({
      buildId: "b1",
      lastEventSeq: -1,
      signal: controller.signal,
      keepaliveIntervalMs: 50,
    });

    const framePromise = gen.next();
    await vi.advanceTimersByTimeAsync(60);
    expect((await framePromise).value).toBe(": keepalive\n\n");

    controller.abort();
    await gen.return(undefined);
  });
});

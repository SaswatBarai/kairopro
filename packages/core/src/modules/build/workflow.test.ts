import { beforeEach, describe, expect, it, vi } from "vitest";

const findBuildByIdMock = vi.fn();
vi.mock("./build.repository", () => ({
  findBuildById: (...args: unknown[]) => findBuildByIdMock(...args),
}));

const emitLogMock = vi.fn();
vi.mock("./logs", () => ({
  emitLog: (...args: unknown[]) => emitLogMock(...args),
}));

import type { RequestContext } from "../../lib/context";
import { runWorkflow, type BuildStep } from "./workflow";

const ctx: RequestContext = { userId: "u1", orgId: "o1" };

beforeEach(() => {
  vi.clearAllMocks();
  emitLogMock.mockResolvedValue(undefined);
});

describe("runWorkflow (BE-10)", () => {
  it("runs every step in order when never cancelled", async () => {
    findBuildByIdMock.mockResolvedValue({ status: "RUNNING" });
    const calls: string[] = [];
    const steps: BuildStep[] = [
      {
        name: "a",
        run: async () => {
          calls.push("a");
        },
      },
      {
        name: "b",
        run: async () => {
          calls.push("b");
        },
      },
    ];
    const onCancelled = vi.fn();

    const outcome = await runWorkflow({
      buildId: "b1",
      projectId: "p1",
      ctx,
      steps,
      onCancelled,
    });

    expect(outcome).toBe("completed");
    expect(calls).toEqual(["a", "b"]);
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it("checks cancel at every step boundary", async () => {
    findBuildByIdMock.mockResolvedValue({ status: "RUNNING" });
    const steps: BuildStep[] = [
      { name: "a", run: async () => {} },
      { name: "b", run: async () => {} },
    ];

    await runWorkflow({
      buildId: "b1",
      projectId: "p1",
      ctx,
      steps,
      onCancelled: vi.fn(),
    });

    expect(findBuildByIdMock).toHaveBeenCalledTimes(2);
  });

  it("stops at the next boundary and records a checkpoint when cancelled mid-run", async () => {
    findBuildByIdMock
      .mockResolvedValueOnce({ status: "RUNNING" }) // boundary before "a"
      .mockResolvedValueOnce({ status: "CANCELLED" }); // boundary before "b"
    const calls: string[] = [];
    const steps: BuildStep[] = [
      {
        name: "a",
        run: async () => {
          calls.push("a");
        },
      },
      {
        name: "b",
        run: async () => {
          calls.push("b");
        },
      },
    ];
    const onCancelled = vi.fn();

    const outcome = await runWorkflow({
      buildId: "b1",
      projectId: "p1",
      ctx,
      steps,
      onCancelled,
    });

    expect(outcome).toBe("cancelled");
    expect(calls).toEqual(["a"]); // step "b" never ran — cancel is checked before it starts
    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect(onCancelled.mock.calls[0]?.[1]).toBe("b");
    expect(emitLogMock).toHaveBeenCalledWith(
      "b1",
      "CHECKPOINT",
      expect.stringContaining("cancelled"),
    );
  });

  it("propagates a step's own failure without swallowing it", async () => {
    findBuildByIdMock.mockResolvedValue({ status: "RUNNING" });
    const steps: BuildStep[] = [
      {
        name: "a",
        run: async () => {
          throw new Error("boom");
        },
      },
    ];

    await expect(
      runWorkflow({
        buildId: "b1",
        projectId: "p1",
        ctx,
        steps,
        onCancelled: vi.fn(),
      }),
    ).rejects.toThrow("boom");
  });

  it("treats a missing build row as not cancelled", async () => {
    findBuildByIdMock.mockResolvedValue(null);
    const steps: BuildStep[] = [{ name: "a", run: async () => {} }];

    const outcome = await runWorkflow({
      buildId: "b1",
      projectId: "p1",
      ctx,
      steps,
      onCancelled: vi.fn(),
    });

    expect(outcome).toBe("completed");
  });

  it("shares one mutable state object across every step", async () => {
    findBuildByIdMock.mockResolvedValue({ status: "RUNNING" });
    const steps: BuildStep[] = [
      {
        name: "a",
        run: async ({ state }) => {
          state.containerId = "c1";
        },
      },
      {
        name: "b",
        run: async ({ state }) => {
          expect(state.containerId).toBe("c1");
        },
      },
    ];

    await runWorkflow({
      buildId: "b1",
      projectId: "p1",
      ctx,
      steps,
      onCancelled: vi.fn(),
    });
  });
});

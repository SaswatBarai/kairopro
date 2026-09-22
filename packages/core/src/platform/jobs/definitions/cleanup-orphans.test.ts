import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContainerRuntime } from "../../container/runtime";

vi.mock("../../../modules/build/build.repository", () => ({
  createInternalErrorRow: vi.fn(),
}));
vi.mock("../../../modules/project/project.repository", () => ({
  findProjectById: vi.fn(),
}));

import { createInternalErrorRow } from "../../../modules/build/build.repository";
import { findProjectById } from "../../../modules/project/project.repository";
import { runCleanupOrphans } from "./cleanup-orphans";

function fakeRuntime(
  overrides: Partial<ContainerRuntime> = {},
): ContainerRuntime {
  return {
    provision: vi.fn(),
    exec: vi.fn(),
    execStream: vi.fn(),
    health: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([
      { containerId: "c-1", projectId: "p-1" },
      { containerId: "c-2", projectId: "p-2" },
    ]),
    ...overrides,
  } as unknown as ContainerRuntime;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runCleanupOrphans (BE-11)", () => {
  it("removes a container with no matching project and leaves a matching one", async () => {
    vi.mocked(findProjectById).mockImplementation((id) =>
      Promise.resolve(id === "p-1" ? ({ id: "p-1" } as never) : null),
    );
    const runtime = fakeRuntime();

    const result = await runCleanupOrphans(runtime);

    expect(result.removed).toEqual(["c-2"]);
    expect(runtime.destroy).toHaveBeenCalledTimes(1);
    expect(runtime.destroy).toHaveBeenCalledWith("c-2");
  });

  it("logs an InternalError and continues when a destroy fails", async () => {
    vi.mocked(findProjectById).mockResolvedValue(null);
    const runtime = fakeRuntime({
      destroy: vi.fn().mockRejectedValue(new Error("boom")),
    });

    const result = await runCleanupOrphans(runtime);

    expect(result.removed).toEqual([]);
    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({ step: "cleanup-orphans", resolved: false }),
    );
  });
});

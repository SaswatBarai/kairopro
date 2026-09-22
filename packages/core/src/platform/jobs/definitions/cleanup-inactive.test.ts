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
import {
  INACTIVITY_THRESHOLD_MS,
  runCleanupInactive,
} from "./cleanup-inactive";

const NOW = 10_000_000;

function fakeRuntime(
  overrides: Partial<ContainerRuntime> = {},
): ContainerRuntime {
  return {
    provision: vi.fn(),
    exec: vi.fn(),
    execStream: vi.fn(),
    health: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    list: vi.fn().mockResolvedValue([{ containerId: "c-1", projectId: "p-1" }]),
    ...overrides,
  } as unknown as ContainerRuntime;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runCleanupInactive (BE-11)", () => {
  it("stops an idle, non-deployed preview container", async () => {
    vi.mocked(findProjectById).mockResolvedValue({
      id: "p-1",
      status: "READY",
      lastActiveAt: new Date(NOW - INACTIVITY_THRESHOLD_MS - 1000),
      updatedAt: new Date(NOW - INACTIVITY_THRESHOLD_MS - 1000),
    } as never);
    const runtime = fakeRuntime();

    const result = await runCleanupInactive(runtime, () => NOW);

    expect(result.stopped).toEqual(["p-1"]);
    expect(runtime.stop).toHaveBeenCalledWith("c-1");
  });

  it("leaves a deployed app alone even when idle", async () => {
    vi.mocked(findProjectById).mockResolvedValue({
      id: "p-1",
      status: "DEPLOYED",
      lastActiveAt: new Date(NOW - INACTIVITY_THRESHOLD_MS - 1000),
      updatedAt: new Date(NOW - INACTIVITY_THRESHOLD_MS - 1000),
    } as never);
    const runtime = fakeRuntime();

    const result = await runCleanupInactive(runtime, () => NOW);

    expect(result.stopped).toEqual([]);
    expect(runtime.stop).not.toHaveBeenCalled();
  });

  it("skips a recently active preview", async () => {
    vi.mocked(findProjectById).mockResolvedValue({
      id: "p-1",
      status: "READY",
      lastActiveAt: new Date(NOW - 1000),
      updatedAt: new Date(NOW - 1000),
    } as never);
    const runtime = fakeRuntime();

    const result = await runCleanupInactive(runtime, () => NOW);

    expect(result.stopped).toEqual([]);
    expect(runtime.stop).not.toHaveBeenCalled();
  });

  it("skips an orphaned container (no matching project)", async () => {
    vi.mocked(findProjectById).mockResolvedValue(null);
    const runtime = fakeRuntime();

    const result = await runCleanupInactive(runtime, () => NOW);

    expect(result.stopped).toEqual([]);
    expect(runtime.stop).not.toHaveBeenCalled();
  });

  it("logs an InternalError and continues when a stop fails", async () => {
    vi.mocked(findProjectById).mockResolvedValue({
      id: "p-1",
      status: "READY",
      lastActiveAt: new Date(NOW - INACTIVITY_THRESHOLD_MS - 1000),
      updatedAt: new Date(NOW - INACTIVITY_THRESHOLD_MS - 1000),
    } as never);
    const runtime = fakeRuntime({
      stop: vi.fn().mockRejectedValue(new Error("docker unreachable")),
    });

    const result = await runCleanupInactive(runtime, () => NOW);

    expect(result.stopped).toEqual([]);
    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({ step: "cleanup-inactive", resolved: false }),
    );
  });
});

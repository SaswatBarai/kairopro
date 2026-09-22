import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../modules/build/build.repository", () => ({
  createInternalErrorRow: vi.fn(),
}));

import { createInternalErrorRow } from "../../../modules/build/build.repository";
import { runHealthProbe } from "./health-probe";

function fakeRuntime(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    provision: vi.fn(),
    exec: vi.fn(),
    execStream: vi.fn(),
    health: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
    list: vi.fn().mockResolvedValue([
      { containerId: "c-1", projectId: "p-1" },
      { containerId: "c-2", projectId: "p-2" },
    ]),
    ...overrides,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runHealthProbe (BE-11)", () => {
  it("reports and logs an unhealthy container, leaving a healthy one out", async () => {
    const health = vi
      .fn()
      .mockResolvedValueOnce({ ready: true })
      .mockResolvedValueOnce({ ready: false, detail: "unhealthy" });
    const runtime = fakeRuntime({ health });

    const result = await runHealthProbe(runtime);

    expect(result.unhealthy).toEqual(["p-2"]);
    expect(createInternalErrorRow).toHaveBeenCalledTimes(1);
    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({
        step: "health-probe",
        resolved: false,
      }),
    );
  });

  it("logs nothing when every container is ready", async () => {
    const runtime = fakeRuntime({
      health: vi.fn().mockResolvedValue({ ready: true }),
    });

    const result = await runHealthProbe(runtime);

    expect(result.unhealthy).toEqual([]);
    expect(createInternalErrorRow).not.toHaveBeenCalled();
  });
});

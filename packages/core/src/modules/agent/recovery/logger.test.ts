import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../build/build.repository", () => ({
  createInternalErrorRow: vi.fn(),
}));

import { createInternalErrorRow } from "../../build/build.repository";
import { logRecoveryFailure } from "./logger";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createInternalErrorRow).mockResolvedValue({
    id: "err-1",
  } as never);
});

describe("logRecoveryFailure (AI-7)", () => {
  it("writes a row with step, type, message, file, attempt, approach, and resolution", async () => {
    await logRecoveryFailure({
      buildId: "b1",
      step: "src/app/api/tasks/route.ts",
      errorType: "type",
      message: "TS2322: not assignable",
      file: "src/app/api/tasks/route.ts",
      attempt: 2,
      approach: 1,
      resolution: "fixed",
      resolved: true,
    });

    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({
        buildId: "b1",
        step: "src/app/api/tasks/route.ts",
        errorType: "type",
        message: "TS2322: not assignable",
        resolution: "fixed",
        resolved: true,
        detail: expect.objectContaining({
          file: "src/app/api/tasks/route.ts",
          attempt: 2,
          approach: 1,
        }),
      }),
    );
  });

  it("defaults buildId to null and file to null when not given", async () => {
    await logRecoveryFailure({
      step: "unit",
      errorType: "unrecognized",
      message: "m",
      attempt: 1,
      approach: 1,
      resolution: "halted:unrecognized",
      resolved: false,
    });

    const call = vi.mocked(createInternalErrorRow).mock.calls[0]![0];
    expect(call.buildId).toBeNull();
    expect((call.detail as { file: unknown }).file).toBeNull();
  });

  it("merges extra structured detail alongside file/attempt/approach", async () => {
    await logRecoveryFailure({
      step: "unit",
      errorType: "never-degradable",
      message: "m",
      attempt: 3,
      approach: 3,
      resolution: "halted:never-degradable",
      resolved: false,
      detail: { concern: "authorization" },
    });

    const call = vi.mocked(createInternalErrorRow).mock.calls[0]![0];
    expect(call.detail).toMatchObject({
      concern: "authorization",
      attempt: 3,
      approach: 3,
    });
  });

  it("returns the persisted row", async () => {
    const row = await logRecoveryFailure({
      step: "unit",
      errorType: "type",
      message: "m",
      attempt: 1,
      approach: 1,
      resolution: "fixed",
      resolved: true,
    });
    expect(row).toEqual({ id: "err-1" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../build/build.repository", () => ({
  createInternalErrorRow: vi.fn().mockResolvedValue({ id: "err-1" }),
}));

import { createInternalErrorRow } from "../../build/build.repository";
import { runFixLoop, type AttemptOutcome } from "./fix-loop";

function fail(message: string, source = "typecheck"): AttemptOutcome<string> {
  return { ok: false, failure: { signal: { source, message } } };
}
function succeed(value: string): AttemptOutcome<string> {
  return { ok: true, value };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runFixLoop (AI-7)", () => {
  it("succeeds on attempt 2, without degrading or logging a resolution", async () => {
    const attempt = vi
      .fn()
      .mockResolvedValueOnce(fail("TS2322: bad"))
      .mockResolvedValueOnce(succeed("ok"));

    const result = await runFixLoop({
      unitName: "src/lib/x.ts",
      concern: "layout",
      originalTask: "Build x.",
      attempt,
    });

    expect(result).toEqual({
      status: "succeeded",
      value: "ok",
      attempts: 2,
      level: "full",
    });
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("each retry's prompt input includes the previous attempt's observed failure", async () => {
    const attempt = vi
      .fn()
      .mockResolvedValueOnce(fail("TS2322: first failure"))
      .mockResolvedValueOnce(succeed("ok"));

    await runFixLoop({
      unitName: "x.ts",
      concern: "layout",
      originalTask: "Build x.",
      attempt,
    });

    const firstCall = attempt.mock.calls[0]![0];
    const secondCall = attempt.mock.calls[1]![0];
    expect(firstCall.previousFailure).toBeUndefined();
    expect(secondCall.previousFailure).toBe("TS2322: first failure");
  });

  it("exhausts at the attempt cap and halts, logging an InternalError", async () => {
    const attempt = vi.fn().mockResolvedValue(fail("still broken"));

    const result = await runFixLoop({
      unitName: "x.ts",
      concern: "layout",
      originalTask: "Build x.",
      buildId: "b1",
      maxAttemptsPerError: 5,
      attempt,
    });

    expect(result.status).toBe("halted");
    expect((result as { reason: string }).reason).toBe("exhausted");
    expect(result.attempts).toBe(5);
    expect(attempt).toHaveBeenCalledTimes(5);
    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({
        buildId: "b1",
        resolution: "halted:exhausted",
      }),
    );
  });

  it("an unrecognized failure shape halts immediately, without retrying", async () => {
    const attempt = vi
      .fn()
      .mockResolvedValue(fail("mystery failure", "carrier-pigeon"));

    const result = await runFixLoop({
      unitName: "x.ts",
      concern: "layout",
      originalTask: "Build x.",
      attempt,
    });

    expect(result.status).toBe("halted");
    expect((result as { reason: string }).reason).toBe("unrecognized-failure");
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({ errorType: "unrecognized" }),
    );
  });

  it("a degradable unit walks the ladder after exhausting approaches at each level, recording each step", async () => {
    const onDegrade = vi.fn();
    // 3 approaches at "full" fail, then 1 attempt at "simpler" succeeds.
    const attempt = vi
      .fn()
      .mockResolvedValueOnce(fail("e1"))
      .mockResolvedValueOnce(fail("e2"))
      .mockResolvedValueOnce(fail("e3"))
      .mockResolvedValueOnce(succeed("ok-at-simpler"));

    const result = await runFixLoop({
      unitName: "x.ts",
      concern: "layout",
      originalTask: "Build x.",
      maxDistinctApproaches: 3,
      maxAttemptsPerError: 10,
      attempt,
      onDegrade,
    });

    expect(result).toMatchObject({ status: "succeeded", level: "simpler" });
    expect(onDegrade).toHaveBeenCalledTimes(1);
    expect(onDegrade.mock.calls[0]![0].level).toBe("simpler");
    // The 4th call (the one that succeeded) used the "simpler" task, which
    // contains the original task text plus a simplification instruction.
    const fourthCallTask = attempt.mock.calls[3]![0].task as string;
    expect(fourthCallTask).toContain("Build x.");
    expect(fourthCallTask).toMatch(/simplify/i);
    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: "degraded:simpler" }),
    );
  });

  it("a degradable unit that never succeeds walks all the way to omit", async () => {
    const attempt = vi.fn().mockResolvedValue(fail("still broken"));

    const result = await runFixLoop({
      unitName: "x.ts",
      concern: "layout",
      originalTask: "Build x.",
      maxDistinctApproaches: 2,
      maxAttemptsPerError: 100,
      attempt,
    });

    expect(result.status).toBe("omitted");
    expect((result as { message: string }).message).toContain("x.ts");
    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: "omitted" }),
    );
    // "omit" never calls attempt() — there is nothing left to try.
    const levelsRequested = attempt.mock.calls.map((c) => c[0].level);
    expect(levelsRequested).not.toContain("omit");
  });

  it("a never-degradable unit halts instead of walking the ladder", async () => {
    const onDegrade = vi.fn();
    const attempt = vi.fn().mockResolvedValue(fail("permission check missing"));

    const result = await runFixLoop({
      unitName: "src/app/api/admin/route.ts",
      concern: "authorization",
      originalTask: "Enforce the admin-only permission check.",
      maxDistinctApproaches: 3,
      maxAttemptsPerError: 10,
      attempt,
      onDegrade,
    });

    expect(result.status).toBe("halted");
    expect((result as { reason: string }).reason).toBe("never-degradable");
    expect(onDegrade).not.toHaveBeenCalled();
    // Only ever retried at the "full" level — never simplified.
    const levelsRequested = attempt.mock.calls.map((c) => c[0].level);
    expect(new Set(levelsRequested)).toEqual(new Set(["full"]));
    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({
        resolution: "halted:never-degradable",
        resolved: false,
      }),
    );
  });

  it("tenant-isolation and money-handling concerns are also never-degradable", async () => {
    const attempt = vi.fn().mockResolvedValue(fail("cross-tenant leak"));

    const tenantResult = await runFixLoop({
      unitName: "x.ts",
      concern: "tenant-isolation",
      originalTask: "t",
      maxDistinctApproaches: 1,
      attempt,
    });
    expect(tenantResult.status).toBe("halted");

    const moneyAttempt = vi.fn().mockResolvedValue(fail("wrong total"));
    const moneyResult = await runFixLoop({
      unitName: "y.ts",
      concern: "money-handling",
      originalTask: "t",
      maxDistinctApproaches: 1,
      attempt: moneyAttempt,
    });
    expect(moneyResult.status).toBe("halted");
  });
});

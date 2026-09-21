import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../../lib/context";
import { ValidationError } from "../../../../lib/errors";
import type { TestCase } from "../../phases/test-authoring";
import type {
  LLMCompleteResult,
  LLMMessage,
  LLMProvider,
} from "../../llm/provider";

vi.mock("../../../build/build.repository", () => ({
  createInternalErrorRow: vi.fn().mockResolvedValue({ id: "err-1" }),
}));
vi.mock("../../../spec/spec.repository", () => ({
  findApprovedSpecsByTypes: vi.fn(),
}));
vi.mock("../../../usage/usage.service", () => ({ emit: vi.fn() }));
vi.mock("../../validators/typecheck", () => ({ runTypecheck: vi.fn() }));
vi.mock("../../context/retrieve", () => ({ retrieve: vi.fn() }));

import { createInternalErrorRow } from "../../../build/build.repository";
import { retrieve } from "../../context/retrieve";
import { runTypecheck } from "../../validators/typecheck";
import {
  guardTestModification,
  looksLikeTestPath,
  repairFromTestFailure,
  runTestPhase,
  runTestSuite,
  UnresolvedTestFailuresError,
} from "./run-tests";

const ctx: RequestContext = { userId: "u1", orgId: "o1" };

function result(content: string): LLMCompleteResult {
  return {
    content,
    usage: { inputTokens: 1, outputTokens: 1 },
    stopReason: "end_turn",
  };
}
function providerReturningRepeating(content: string): LLMProvider {
  return {
    name: "fake",
    complete: vi.fn().mockResolvedValue(result(content)),
    stream: vi.fn(),
  };
}
function providerReturning(...contents: string[]): LLMProvider {
  const complete = vi.fn();
  for (const c of contents) complete.mockResolvedValueOnce(result(c));
  return { name: "fake", complete, stream: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(retrieve).mockResolvedValue({
    summary: "summary",
    files: [],
    partial: false,
    omitted: [],
  });
});

describe("guardTestModification / looksLikeTestPath (AI-8)", () => {
  it("recognizes vitest/playwright test-file conventions", () => {
    expect(looksLikeTestPath("src/__tests__/unit/x.test.ts")).toBe(true);
    expect(looksLikeTestPath("e2e/checkout.spec.ts")).toBe(true);
    expect(looksLikeTestPath("src/app/api/tasks/route.ts")).toBe(false);
  });

  it("rejects modifying a test file without the spec-contradiction flag", () => {
    expect(() =>
      guardTestModification("src/__tests__/unit/x.test.ts", false),
    ).toThrow(ValidationError);
  });

  it("allows it when the spec-contradiction flag is set", () => {
    expect(() =>
      guardTestModification("src/__tests__/unit/x.test.ts", true),
    ).not.toThrow();
  });

  it("never restricts a non-test implementation path", () => {
    expect(() =>
      guardTestModification("src/app/api/tasks/route.ts", false),
    ).not.toThrow();
  });
});

describe("runTestSuite (AI-8)", () => {
  it("runs vitest for unit/integration and reads back the redirected report file", async () => {
    const exec = vi
      .fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" }) // the test run itself
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({ testResults: [] }),
        stderr: "",
      });
    const runtime = { exec } as never;

    const report = await runTestSuite({
      runtime,
      containerId: "c1",
      level: "unit",
    });

    expect(report).toEqual({ total: 0, passed: 0, failed: 0, results: [] });
    expect(exec).toHaveBeenCalledTimes(2);
    expect(exec.mock.calls[0]![0].cmd).toContain("vitest run");
    expect(exec.mock.calls[0]![0].cmd).toContain("src/__tests__/unit");
    expect(exec.mock.calls[1]![0].cmd).toContain(
      "cat test-results/report.json",
    );
  });

  it("runs playwright for e2e and parses with the playwright parser", async () => {
    const exec = vi
      .fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({ suites: [] }),
        stderr: "",
      });
    const runtime = { exec } as never;

    await runTestSuite({ runtime, containerId: "c1", level: "e2e" });

    expect(exec.mock.calls[0]![0].cmd).toContain("playwright test");
  });

  it("throws a typed error when the report can't be parsed", async () => {
    const exec = vi
      .fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: "not json",
        stderr: "boom",
      });
    const runtime = { exec } as never;

    await expect(
      runTestSuite({ runtime, containerId: "c1", level: "unit" }),
    ).rejects.toThrow(/Could not parse/);
  });
});

describe("repairFromTestFailure (AI-8) — feeds the failing assertion, guards the test", () => {
  it("a failing test produces a fix attempt whose prompt includes the assertion text", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([]);
    const workspace = {
      writeFile: vi.fn().mockResolvedValue(undefined),
    } as never;
    const provider = providerReturningRepeating("export function fixed() {}");

    const outcome = await repairFromTestFailure({
      implementationPath: "src/app/api/tasks/route.ts",
      concern: "other",
      failingAssertion: "expected 403 but got 200 — anyone could delete a task",
      conventions: "conv",
      specs: "specs",
      projectId: "p1",
      ctx,
      workspace,
      runtime: {} as never,
      containerId: "c1",
      provider,
    });

    expect(outcome).toEqual({ status: "fixed", attempts: 1, level: "full" });
    const promptText = (
      provider.complete as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0]![0].messages.map((m: LLMMessage) => m.content).join("\n");
    expect(promptText).toContain("anyone could delete a task");
  });

  it("rejects an attempt to modify a test file, and logs it, without calling the provider", async () => {
    const provider = providerReturningRepeating("modified test content");

    const outcome = await repairFromTestFailure({
      implementationPath: "src/__tests__/integration/permission-x.test.ts",
      concern: "authorization",
      failingAssertion: "expected forbidden but the call succeeded",
      conventions: "conv",
      specs: "specs",
      projectId: "p1",
      ctx,
      workspace: { writeFile: vi.fn() } as never,
      runtime: {} as never,
      containerId: "c1",
      provider,
    });

    expect(outcome).toEqual({
      status: "rejected",
      reason: "test-modification-not-allowed",
    });
    expect(provider.complete).not.toHaveBeenCalled();
    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: "rejected:test-modification" }),
    );
  });

  it("allows modifying a test file when the test contradicts an approved spec, and logs that exception", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([]);
    const workspace = {
      writeFile: vi.fn().mockResolvedValue(undefined),
    } as never;
    const provider = providerReturningRepeating(
      "corrected test asserting the real spec",
    );
    const onSpecContradiction = vi.fn();

    const outcome = await repairFromTestFailure({
      implementationPath: "src/__tests__/integration/permission-x.test.ts",
      concern: "authorization",
      failingAssertion: "the test asserted the wrong role per the approved PRD",
      conventions: "conv",
      specs: "specs",
      projectId: "p1",
      ctx,
      workspace,
      runtime: {} as never,
      containerId: "c1",
      provider,
      allowSpecContradiction: true,
      onSpecContradiction,
    });

    expect(outcome.status).toBe("fixed");
    expect(onSpecContradiction).toHaveBeenCalledWith(
      "src/__tests__/integration/permission-x.test.ts",
      "the test asserted the wrong role per the approved PRD",
    );
    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: "spec-contradiction-override" }),
    );
  });

  it("a never-degradable concern that can't be repaired halts, not silently degraded", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([
      {
        file: "route.ts",
        line: 1,
        column: 1,
        code: "TS2322",
        message: "still broken",
      },
    ]);
    const workspace = {
      writeFile: vi.fn().mockResolvedValue(undefined),
    } as never;
    const provider = providerReturningRepeating("still broken code");

    const outcome = await repairFromTestFailure({
      implementationPath: "src/app/api/tasks/route.ts",
      concern: "authorization",
      failingAssertion: "expected forbidden but the call succeeded",
      conventions: "conv",
      specs: "specs",
      projectId: "p1",
      ctx,
      workspace,
      runtime: {} as never,
      containerId: "c1",
      provider,
      maxDistinctApproaches: 2,
      maxFixAttempts: 10,
    });

    expect(outcome).toEqual({ status: "halted", reason: "never-degradable" });
  });
});

describe("runTestPhase (AI-8) — unresolved failures are surfaced, not swallowed", () => {
  const testCases: TestCase[] = [
    {
      level: "unit",
      path: "src/__tests__/unit/invariant-0.test.ts",
      description: "d",
      task: "t",
      source: "invariant",
      concern: "data-invariants",
      implementationPath: null,
    },
    {
      level: "integration",
      path: "src/__tests__/integration/permission-manager-task-delete.test.ts",
      description: "d",
      task: "t",
      source: "permission",
      concern: "authorization",
      implementationPath: "src/app/api/tasks/route.ts",
    },
    {
      level: "e2e",
      path: "e2e/primary-flow-0-tasks.spec.ts",
      description: "d",
      task: "t",
      source: "primary-flow",
      concern: "other",
      implementationPath: "src/app/tasks/page.tsx",
    },
  ];

  it("returns green when every level passes on the first run", async () => {
    const exec = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ testResults: [], suites: [] }),
      stderr: "",
    });
    const runtime = { exec } as never;

    const outcome = await runTestPhase({
      projectId: "p1",
      ctx,
      workspace: { writeFile: vi.fn() } as never,
      runtime,
      containerId: "c1",
      conventions: "conv",
      specs: "specs",
      testCases,
    });

    expect(outcome.status).toBe("green");
  });

  it("repairs a failing test with a known implementation target, then re-runs before deciding", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([]);
    const failingUnitReport = JSON.stringify({
      testResults: [
        {
          name: "src/__tests__/integration/permission-manager-task-delete.test.ts",
          assertionResults: [
            {
              fullName: "x",
              title: "x",
              status: "failed",
              failureMessages: ["expected 403 but got 200"],
            },
          ],
        },
      ],
    });
    const cleanReport = JSON.stringify({ testResults: [] });

    // Call sequence: unit run, unit cat(green) -> integration run, integration
    // cat(failing) -> repair's own retrieve/typecheck exec -> integration
    // re-run, re-run cat(green) -> e2e run, e2e cat(green, suites shape).
    const exec = vi
      .fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" }) // unit run
      .mockResolvedValueOnce({ exitCode: 0, stdout: cleanReport, stderr: "" }) // unit cat
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" }) // integration run
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: failingUnitReport,
        stderr: "",
      }) // integration cat
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" }) // integration re-run
      .mockResolvedValueOnce({ exitCode: 0, stdout: cleanReport, stderr: "" }) // integration re-cat
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" }) // e2e run
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({ suites: [] }),
        stderr: "",
      }); // e2e cat
    const runtime = { exec } as never;
    const workspace = { writeFile: vi.fn().mockResolvedValue(undefined) };
    const provider = providerReturning(
      "export function fixed() { /* enforces the check */ }",
    );

    const onRepair = vi.fn();
    const outcome = await runTestPhase({
      projectId: "p1",
      ctx,
      workspace: workspace as never,
      runtime,
      containerId: "c1",
      conventions: "conv",
      specs: "specs",
      testCases,
      provider,
      onRepair,
    });

    expect(outcome.status).toBe("green");
    expect(onRepair).toHaveBeenCalledWith(
      "src/__tests__/integration/permission-manager-task-delete.test.ts",
      expect.objectContaining({ status: "fixed" }),
    );
    // The repair wrote to the implementation, never the test file.
    expect(workspace.writeFile).toHaveBeenCalledWith(
      "p1",
      "src/app/api/tasks/route.ts",
      expect.any(String),
    );
  });

  it("throws UnresolvedTestFailuresError when a failure has no known repair target", async () => {
    const failingReport = JSON.stringify({
      testResults: [
        {
          name: "src/__tests__/unit/invariant-0.test.ts",
          assertionResults: [
            {
              fullName: "x",
              title: "x",
              status: "failed",
              failureMessages: ["invariant violated"],
            },
          ],
        },
      ],
    });
    const exec = vi.fn().mockImplementation(async (input: { cmd: string }) => {
      if (input.cmd.startsWith("cat")) {
        return { exitCode: 0, stdout: failingReport, stderr: "" };
      }
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const runtime = { exec } as never;

    await expect(
      runTestPhase({
        projectId: "p1",
        ctx,
        workspace: { writeFile: vi.fn() } as never,
        runtime,
        containerId: "c1",
        conventions: "conv",
        specs: "specs",
        testCases,
      }),
    ).rejects.toBeInstanceOf(UnresolvedTestFailuresError);
  });

  it("stops before the next level once cancelled", async () => {
    const exec = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ testResults: [] }),
      stderr: "",
    });
    const runtime = { exec } as never;
    const checkCancelled = vi.fn().mockResolvedValue(true);

    const outcome = await runTestPhase({
      projectId: "p1",
      ctx,
      workspace: { writeFile: vi.fn() } as never,
      runtime,
      containerId: "c1",
      conventions: "conv",
      specs: "specs",
      testCases,
      checkCancelled,
    });

    expect(outcome.status).toBe("cancelled");
    expect(exec).not.toHaveBeenCalled();
  });
});

import type { RequestContext } from "../../../../lib/context";
import { ProviderError, ValidationError } from "../../../../lib/errors";
import type { ContainerRuntime } from "../../../../platform/container/runtime";
import type { WorkspaceStore } from "../../../../platform/workspace/store";
import { retrieve } from "../../context/retrieve";
import { getLLMProvider } from "../../llm";
import type { LLMProvider } from "../../llm/provider";
import { modelFor } from "../../llm/router";
import { completeWithValidator } from "../../llm/structured";
import type { TestCase, TestLevel } from "../../phases/test-authoring";
import { TEST_LEVELS } from "../../phases/test-authoring";
import { renderPrompt } from "../../prompts/loader";
import type { DegradationLevel } from "../../recovery/degradation";
import { runFixLoop, type AttemptOutcome } from "../../recovery/fix-loop";
import { logRecoveryFailure } from "../../recovery/logger";
import type { ConcernCategory } from "../../recovery/rules";
import {
  parsePlaywrightOutput,
  parseVitestOutput,
  type TestReport,
  type TestResult,
} from "../../test/report";
import { runTypecheck, type TypecheckError } from "../../validators/typecheck";

/**
 * Test execution and failure-driven repair (Phase 18 / AI-8). Runs the
 * tests `phases/test-authoring.ts` wrote, and — for a failure that names
 * the implementation it targets — repairs *that*, never the test. "The
 * fix loop may not modify a test to make it pass" is enforced by
 * `guardTestModification`, not left to the model's good judgment.
 */

const REPORT_PATH = "test-results/report.json";
const STDERR_PATH = "test-results/report.stderr";

/**
 * Failing the suite must not fail this shell command — `; true` keeps the
 * exec's own exit code irrelevant; the *parsed report* is the signal this
 * reads, never the process exit code.
 *
 * Neither runner's JSON goes to stdout by default — verified against the
 * actual installed Vitest, which writes a *confirmation message* ("JSON
 * report written to …") to stdout and the real report to
 * `.vitest/json/output.json` unless told otherwise; shell-redirecting
 * stdout silently captured that message instead of the report. Both
 * runners are told explicitly where to write instead: Vitest's
 * `--outputFile` flag, Playwright's `PLAYWRIGHT_JSON_OUTPUT_NAME` env var
 * (its own `--reporter=json` streams to stdout by default, which the same
 * class of surprise could apply to depending on the installed version —
 * this sidesteps it the same way for both).
 */
function commandFor(level: TestLevel): string {
  if (level === "e2e") {
    return `mkdir -p test-results && PLAYWRIGHT_JSON_OUTPUT_NAME=${REPORT_PATH} npx playwright test --reporter=json >${STDERR_PATH} 2>&1; true`;
  }
  const dir =
    level === "unit" ? "src/__tests__/unit" : "src/__tests__/integration";
  return `mkdir -p test-results && npx vitest run ${dir} --reporter=json --outputFile=${REPORT_PATH} >${STDERR_PATH} 2>&1; true`;
}

export interface RunTestSuiteInput {
  runtime: ContainerRuntime;
  containerId: string;
  cwd?: string;
  level: TestLevel;
}

/** Runs one level's test suite inside the project container and parses
 * its report — never the exec's raw exit code, the report's own
 * pass/fail counts. */
export async function runTestSuite(
  input: RunTestSuiteInput,
): Promise<TestReport> {
  await input.runtime.exec({
    containerId: input.containerId,
    cmd: commandFor(input.level),
    cwd: input.cwd,
    timeoutMs: 300_000,
  });

  const cat = await input.runtime.exec({
    containerId: input.containerId,
    cmd: `cat ${REPORT_PATH}`,
    cwd: input.cwd,
    timeoutMs: 30_000,
  });

  const parse =
    input.level === "e2e" ? parsePlaywrightOutput : parseVitestOutput;
  try {
    return parse(cat.stdout);
  } catch (cause) {
    throw new ProviderError({
      message: `Could not parse ${input.level} test results`,
      details: { level: input.level, stdout: cat.stdout, stderr: cat.stderr },
      cause,
    });
  }
}

const TEST_PATH_RE = /(\.test\.tsx?$|\.spec\.tsx?$|\/__tests__\/|^e2e\/)/;

/** True for anything that looks like a generated test file, by the same
 * path conventions `test-authoring.ts` writes to. */
export function looksLikeTestPath(path: string): boolean {
  return TEST_PATH_RE.test(path);
}

/** The guardrail: throws unless `path` isn't a test file, or the caller
 * has explicitly flagged this as a documented spec-contradiction
 * exception. Never silently allowed — every call that reaches the `throw`
 * or the exception branch is meant to be visible in a test asserting on
 * this function directly. */
export function guardTestModification(
  path: string,
  allowSpecContradiction: boolean,
): void {
  if (!looksLikeTestPath(path)) return;
  if (allowSpecContradiction) return;
  throw new ValidationError({
    message: `Refusing to modify test file "${path}" to make it pass — the fix loop may only repair the implementation, never the test, unless the test contradicts an approved spec`,
    details: { path },
  });
}

function formatTypecheckErrors(errors: TypecheckError[]): string {
  return errors
    .map((e) => `${e.file}(${e.line},${e.column}): ${e.code}: ${e.message}`)
    .join("\n");
}

export interface RepairFromTestFailureInput {
  /** The file being repaired — normally the implementation the failing
   * test names; only ever a test file itself when `allowSpecContradiction`
   * is set. */
  implementationPath: string;
  concern: ConcernCategory;
  /** The test's own failing assertion — this is what the repair prompt
   * sees, never a bare exit code. */
  failingAssertion: string;
  conventions: string;
  specs: string;
  projectId: string;
  buildId?: string | null;
  ctx: RequestContext;
  workspace: WorkspaceStore;
  runtime: ContainerRuntime;
  containerId: string;
  cwd?: string;
  provider?: LLMProvider;
  maxFixAttempts?: number;
  maxDistinctApproaches?: number;
  /** Set only when the failing test itself is wrong against an approved
   * spec — the one case `guardTestModification` allows. Every use is
   * logged as an internal event via `onSpecContradiction`, whether or not
   * this flag turns out to be warranted. */
  allowSpecContradiction?: boolean;
  onSpecContradiction?: (path: string, reason: string) => void;
  onDegrade?: (step: { level: DegradationLevel; message: string }) => void;
}

export type RepairResult =
  | { status: "fixed"; attempts: number; level: DegradationLevel }
  | { status: "omitted" }
  | { status: "rejected"; reason: string }
  | {
      status: "halted";
      reason: "never-degradable" | "unrecognized-failure" | "exhausted";
    };

/**
 * Repairs the implementation a failing test names, using the test's own
 * assertion failure as the fix loop's starting context — never the test
 * itself, unless `allowSpecContradiction` is set, and that path is always
 * logged as an internal event, not silently taken.
 */
export async function repairFromTestFailure(
  input: RepairFromTestFailureInput,
): Promise<RepairResult> {
  const allow = input.allowSpecContradiction ?? false;

  if (looksLikeTestPath(input.implementationPath) && !allow) {
    await logRecoveryFailure({
      buildId: input.buildId,
      step: input.implementationPath,
      errorType: "test-modification-rejected",
      message: input.failingAssertion,
      attempt: 0,
      approach: 0,
      resolution: "rejected:test-modification",
      resolved: false,
    });
    return { status: "rejected", reason: "test-modification-not-allowed" };
  }

  if (looksLikeTestPath(input.implementationPath) && allow) {
    await logRecoveryFailure({
      buildId: input.buildId,
      step: input.implementationPath,
      errorType: "spec-contradiction",
      message: input.failingAssertion,
      attempt: 0,
      approach: 0,
      resolution: "spec-contradiction-override",
      resolved: true,
    });
    input.onSpecContradiction?.(
      input.implementationPath,
      input.failingAssertion,
    );
  }

  const provider = input.provider ?? getLLMProvider();
  const refs = { projectId: input.projectId, buildId: input.buildId };

  async function attempt(step: {
    task: string;
    previousFailure?: string;
  }): Promise<AttemptOutcome<true>> {
    const error = step.previousFailure ?? input.failingAssertion;

    const retrieved = await retrieve(
      { query: step.task, seedFiles: [input.implementationPath] },
      { id: input.projectId, workspace: input.workspace },
      "fix",
    );
    const context = [
      retrieved.summary,
      ...retrieved.files.map((f) => `--- ${f.path} ---\n${f.contents}`),
    ].join("\n\n");

    const raw = await completeWithValidator({
      provider,
      model: modelFor("fix"),
      messages: [
        { role: "system", content: renderPrompt("system") },
        {
          role: "user",
          content: renderPrompt("fix", {
            path: input.implementationPath,
            conventions: input.conventions,
            error,
            context,
          }),
        },
      ],
      ctx: input.ctx,
      refs,
      validate: (content) => {
        const trimmed = content.trim();
        if (trimmed.length === 0) throw new Error("Fix must not be empty");
        return trimmed;
      },
    });

    await input.workspace.writeFile(
      input.projectId,
      input.implementationPath,
      raw,
    );

    const typeErrors = await runTypecheck({
      runtime: input.runtime,
      containerId: input.containerId,
      cwd: input.cwd,
    });
    if (typeErrors.length > 0) {
      return {
        ok: false,
        failure: {
          signal: {
            source: "typecheck",
            message: formatTypecheckErrors(typeErrors),
          },
        },
      };
    }

    return { ok: true, value: true };
  }

  const result = await runFixLoop<true>({
    unitName: input.implementationPath,
    concern: input.concern,
    originalTask: `Fix ${input.implementationPath} so this failing test passes: ${input.failingAssertion}`,
    buildId: input.buildId,
    maxAttemptsPerError: input.maxFixAttempts,
    maxDistinctApproaches: input.maxDistinctApproaches,
    attempt,
    onDegrade: input.onDegrade,
  });

  if (result.status === "succeeded") {
    return { status: "fixed", attempts: result.attempts, level: result.level };
  }
  if (result.status === "omitted") return { status: "omitted" };
  return { status: "halted", reason: result.reason };
}

/** Exhausted repair without every test going green. */
export class UnresolvedTestFailuresError extends ProviderError {
  readonly failures: TestResult[];

  constructor(opts: { failures: TestResult[]; message: string }) {
    super({ message: opts.message, details: { failures: opts.failures } });
    this.failures = opts.failures;
  }
}

export interface RunTestPhaseInput {
  projectId: string;
  buildId?: string | null;
  ctx: RequestContext;
  workspace: WorkspaceStore;
  runtime: ContainerRuntime;
  containerId: string;
  cwd?: string;
  conventions: string;
  specs: string;
  /** From `runTestAuthoringPhase`'s result — the source of truth for which
   * implementation a given test targets and what concern it's tagged
   * with, matched against a failing result by path suffix. */
  testCases: TestCase[];
  provider?: LLMProvider;
  checkCancelled?: () => Promise<boolean>;
  onRepair?: (file: string, outcome: RepairResult) => void;
}

export type RunTestPhaseResult =
  | { status: "green"; reports: Record<TestLevel, TestReport> }
  | { status: "cancelled" };

function matchTestCase(file: string, testCases: TestCase[]): TestCase | null {
  return testCases.find((tc) => file.endsWith(tc.path)) ?? null;
}

/**
 * Runs every level, repairs what it can, and re-runs once. "Green tests
 * proceed to preview; unresolved failures do not silently proceed" —
 * anything still red after a repair pass throws `UnresolvedTestFailuresError`
 * rather than returning a result the caller might not check.
 */
export async function runTestPhase(
  input: RunTestPhaseInput,
): Promise<RunTestPhaseResult> {
  const reports: Partial<Record<TestLevel, TestReport>> = {};

  for (const level of TEST_LEVELS) {
    if (await input.checkCancelled?.()) return { status: "cancelled" };

    let report = await runTestSuite({
      runtime: input.runtime,
      containerId: input.containerId,
      cwd: input.cwd,
      level,
    });

    const failing = report.results.filter((r) => r.status === "failed");
    for (const failure of failing) {
      const testCase = matchTestCase(failure.file, input.testCases);
      if (!testCase?.implementationPath) continue; // no known repair target

      const outcome = await repairFromTestFailure({
        implementationPath: testCase.implementationPath,
        concern: testCase.concern,
        failingAssertion: failure.message ?? `${failure.name} failed`,
        conventions: input.conventions,
        specs: input.specs,
        projectId: input.projectId,
        buildId: input.buildId,
        ctx: input.ctx,
        workspace: input.workspace,
        runtime: input.runtime,
        containerId: input.containerId,
        cwd: input.cwd,
        provider: input.provider,
      });
      input.onRepair?.(failure.file, outcome);
    }

    if (failing.length > 0) {
      report = await runTestSuite({
        runtime: input.runtime,
        containerId: input.containerId,
        cwd: input.cwd,
        level,
      });
    }

    reports[level] = report;
  }

  const stillFailing = TEST_LEVELS.flatMap(
    (level) =>
      reports[level]?.results.filter((r) => r.status === "failed") ?? [],
  );
  if (stillFailing.length > 0) {
    throw new UnresolvedTestFailuresError({
      failures: stillFailing,
      message: `${stillFailing.length} test(s) still fail after repair`,
    });
  }

  return { status: "green", reports: reports as Record<TestLevel, TestReport> };
}

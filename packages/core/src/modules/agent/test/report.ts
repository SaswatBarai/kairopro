/**
 * Test report parsing (Phase 18 / AI-8): turns a runner's raw JSON output
 * into one structured shape the rest of the pipeline works with, whether
 * the run was Vitest (unit/integration) or Playwright (e2e).
 *
 * `parseVitestOutput` is verified against Vitest's actual `--reporter=json`
 * output (captured by hand against a real passing and a real failing test
 * file, not assumed from documentation — Vitest's JSON reporter is
 * Jest-compatible: `testResults[].assertionResults[]`, each with
 * `status`/`title`/`fullName`/`failureMessages`).
 *
 * `parsePlaywrightOutput` follows Playwright's documented, stable JSON
 * reporter schema (`suites[].specs[].tests[].results[]`, nested `suites`
 * for describe blocks) — Playwright isn't a dependency of this monorepo
 * (it ships with the generated project's own skeleton), so this couldn't
 * be captured the same way; the parser is defensive about missing fields
 * for exactly that reason.
 */

export interface TestResult {
  file: string;
  name: string;
  status: "passed" | "failed";
  /** The failing assertion's own message — never a bare exit code. */
  message?: string;
  duration?: number;
}

export interface TestReport {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

function summarize(results: TestResult[]): TestReport {
  let passed = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === "passed") passed += 1;
    else failed += 1;
  }
  return { total: results.length, passed, failed, results };
}

interface VitestAssertionResult {
  fullName?: string;
  title: string;
  status: string;
  duration?: number;
  failureMessages?: string[];
}

interface VitestFileResult {
  name: string;
  assertionResults: VitestAssertionResult[];
}

interface VitestJsonReport {
  testResults: VitestFileResult[];
}

/** Parses Vitest's `--reporter=json` output (Jest-compatible shape).
 * Assertions in a non-terminal state (`pending`/`skipped`/`todo`) are
 * dropped, not counted as failures — they were never actually run. */
export function parseVitestOutput(json: string): TestReport {
  const parsed = JSON.parse(json) as VitestJsonReport;
  const results: TestResult[] = [];

  for (const file of parsed.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status !== "passed" && assertion.status !== "failed") {
        continue;
      }
      results.push({
        file: file.name,
        name: assertion.fullName || assertion.title,
        status: assertion.status,
        message: assertion.failureMessages?.[0],
        duration: assertion.duration,
      });
    }
  }

  return summarize(results);
}

interface PlaywrightTestResult {
  status?: string;
  duration?: number;
  error?: { message?: string };
}

interface PlaywrightSpec {
  title: string;
  tests?: Array<{ results?: PlaywrightTestResult[] }>;
}

interface PlaywrightSuite {
  title: string;
  file?: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightJsonReport {
  suites?: PlaywrightSuite[];
}

/** Parses Playwright's `--reporter=json` output. A spec's *last* result
 * (Playwright can record retries) decides pass/fail; a `skipped` spec is
 * dropped, matching Vitest's pending/todo handling above. */
export function parsePlaywrightOutput(json: string): TestReport {
  const parsed = JSON.parse(json) as PlaywrightJsonReport;
  const results: TestResult[] = [];

  function walk(suite: PlaywrightSuite, fileHint: string): void {
    const file = suite.file ?? fileHint;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const testResults = test.results ?? [];
        const last = testResults[testResults.length - 1];
        if (!last || last.status === "skipped") continue;
        results.push({
          file,
          name: spec.title,
          status: last.status === "passed" ? "passed" : "failed",
          message: last.error?.message,
          duration: last.duration,
        });
      }
    }
    for (const nested of suite.suites ?? []) walk(nested, file);
  }

  for (const suite of parsed.suites ?? []) walk(suite, suite.title);

  return summarize(results);
}

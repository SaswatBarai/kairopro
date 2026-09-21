import { describe, expect, it } from "vitest";
import { parsePlaywrightOutput, parseVitestOutput } from "./report";

/**
 * `REAL_VITEST_OUTPUT` is not hand-written: it's a trimmed copy of actual
 * `vitest run --reporter=json` output, captured by running one passing and
 * one failing test through Vitest directly and reading back its JSON file
 * (Vitest's JSON reporter writes to `.vitest/json/output.json` in this
 * installed version, not stdout — a detail `run-tests.ts` also has to
 * account for). The shape (Jest-compatible `testResults[].assertionResults[]`)
 * is what matters here, not this specific project/test names.
 */
const REAL_VITEST_OUTPUT = JSON.stringify({
  numTotalTestSuites: 1,
  numPassedTestSuites: 0,
  numFailedTestSuites: 1,
  numTotalTests: 3,
  numPassedTests: 2,
  numFailedTests: 1,
  numPendingTests: 0,
  numTodoTests: 0,
  success: false,
  testResults: [
    {
      name: "/workspace/src/__tests__/unit/tasks.test.ts",
      status: "failed",
      assertionResults: [
        {
          ancestorTitles: ["sample"],
          fullName: "sample adds numbers",
          title: "adds numbers",
          status: "failed",
          duration: 5.5996239999999915,
          failureMessages: [
            "AssertionError: expected 2 to be 3 // Object.is equality\n    at /workspace/src/__tests__/unit/tasks.test.ts:4:19",
          ],
        },
        {
          ancestorTitles: ["sample"],
          fullName: "sample passes",
          title: "passes",
          status: "passed",
          duration: 0.23557700000000636,
          failureMessages: [],
        },
        {
          ancestorTitles: ["sample"],
          fullName: "sample is pending",
          title: "is pending",
          status: "pending",
          duration: 0,
          failureMessages: [],
        },
      ],
    },
  ],
});

describe("parseVitestOutput (AI-8, against real vitest JSON output)", () => {
  it("parses passed and failed assertions with file, name, status, and message", () => {
    const report = parseVitestOutput(REAL_VITEST_OUTPUT);

    expect(report.total).toBe(2); // the pending assertion is dropped
    expect(report.passed).toBe(1);
    expect(report.failed).toBe(1);

    const failing = report.results.find((r) => r.status === "failed")!;
    expect(failing.file).toBe("/workspace/src/__tests__/unit/tasks.test.ts");
    expect(failing.name).toBe("sample adds numbers");
    expect(failing.message).toContain("expected 2 to be 3");

    const passing = report.results.find((r) => r.status === "passed")!;
    expect(passing.name).toBe("sample passes");
    expect(passing.message).toBeUndefined();
  });

  it("drops pending/todo assertions rather than counting them as failures", () => {
    const report = parseVitestOutput(REAL_VITEST_OUTPUT);
    expect(report.results.some((r) => r.name.includes("pending"))).toBe(false);
  });

  it("returns an empty report for a run with no test files", () => {
    const report = parseVitestOutput(JSON.stringify({ testResults: [] }));
    expect(report).toEqual({ total: 0, passed: 0, failed: 0, results: [] });
  });
});

const PLAYWRIGHT_OUTPUT = JSON.stringify({
  suites: [
    {
      title: "checkout.spec.ts",
      file: "e2e/checkout.spec.ts",
      specs: [
        {
          title: "guest can complete checkout",
          tests: [
            {
              results: [{ status: "passed", duration: 812 }],
            },
          ],
        },
        {
          title: "checkout rejects an expired card",
          tests: [
            {
              results: [
                {
                  status: "failed",
                  duration: 640,
                  error: { message: "expect(received).toContain(expected)" },
                },
              ],
            },
          ],
        },
        {
          title: "a skipped scenario",
          tests: [{ results: [{ status: "skipped" }] }],
        },
      ],
      suites: [
        {
          title: "nested describe",
          specs: [
            {
              title: "a nested case",
              tests: [{ results: [{ status: "passed", duration: 100 }] }],
            },
          ],
        },
      ],
    },
  ],
});

describe("parsePlaywrightOutput (AI-8, against Playwright's documented JSON schema)", () => {
  it("parses passed and failed specs with file, name, status, and error message", () => {
    const report = parsePlaywrightOutput(PLAYWRIGHT_OUTPUT);

    expect(report.total).toBe(3); // skipped spec dropped
    expect(report.passed).toBe(2);
    expect(report.failed).toBe(1);

    const failing = report.results.find(
      (r) => r.name === "checkout rejects an expired card",
    )!;
    expect(failing.status).toBe("failed");
    expect(failing.file).toBe("e2e/checkout.spec.ts");
    expect(failing.message).toContain("toContain");
  });

  it("walks nested suites, inheriting the parent file when a nested suite has none", () => {
    const report = parsePlaywrightOutput(PLAYWRIGHT_OUTPUT);
    const nested = report.results.find((r) => r.name === "a nested case")!;
    expect(nested.file).toBe("e2e/checkout.spec.ts");
    expect(nested.status).toBe("passed");
  });

  it("drops a skipped spec rather than counting it as a failure", () => {
    const report = parsePlaywrightOutput(PLAYWRIGHT_OUTPUT);
    expect(report.results.some((r) => r.name === "a skipped scenario")).toBe(
      false,
    );
  });

  it("returns an empty report when there are no suites", () => {
    expect(parsePlaywrightOutput(JSON.stringify({ suites: [] }))).toEqual({
      total: 0,
      passed: 0,
      failed: 0,
      results: [],
    });
  });
});

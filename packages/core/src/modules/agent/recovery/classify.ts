/**
 * Failure classification (Phase 17 / AI-7) — table-driven, and deliberately
 * so: a reviewer reads every recognized failure shape in one place, and
 * `fix-loop.ts` only ever retries a failure it recognized here. An
 * unrecognized shape is `"unknown"` and is logged, never blindly retried —
 * retrying a failure the system doesn't understand is how a fix loop turns
 * into an infinite one.
 */

export type FailureCategory =
  "type" | "build" | "runtime" | "test" | "provider" | "unknown";

/** The raw signal a failed attempt reports — deliberately generic (not
 * `TypecheckError`/`ExecResult`/etc.) so `classify` has one input shape
 * regardless of what actually failed. */
export interface FailureSignal {
  /** Where the failure was observed. */
  source: "typecheck" | "exec" | "llm" | "test" | string;
  message: string;
  exitCode?: number;
}

interface ClassificationRule {
  category: FailureCategory;
  matches(signal: FailureSignal): boolean;
}

// Order matters: the first matching rule wins, so a more specific rule
// (e.g. an exec failure that is actually a test run) is listed before a
// more general one (any other exec failure is a build failure).
const RULES: ClassificationRule[] = [
  { category: "type", matches: (s) => s.source === "typecheck" },
  { category: "provider", matches: (s) => s.source === "llm" },
  { category: "test", matches: (s) => s.source === "test" },
  {
    category: "runtime",
    matches: (s) =>
      s.source === "exec" &&
      /\b(ECONNREFUSED|segfault|out of memory|panic|unhandled|EADDRINUSE)\b/i.test(
        s.message,
      ),
  },
  { category: "build", matches: (s) => s.source === "exec" },
];

/** Classifies a failure signal into a known category, or `"unknown"` when
 * no rule recognizes its shape. Pure — no I/O. */
export function classifyFailure(signal: FailureSignal): FailureCategory {
  for (const rule of RULES) {
    if (rule.matches(signal)) return rule.category;
  }
  return "unknown";
}

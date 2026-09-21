import { describe, expect, it } from "vitest";
import {
  buildDegradationLadder,
  DEGRADATION_LADDER,
  describeDegradation,
} from "./degradation";

describe("buildDegradationLadder (AI-7)", () => {
  it("walks full → simpler → simplest → omit, in that order", () => {
    const ladder = buildDegradationLadder("Implement the thing.");
    expect(ladder.map((s) => s.level)).toEqual(DEGRADATION_LADDER);
  });

  it("the full step is the original task, verbatim", () => {
    const ladder = buildDegradationLadder("Implement the thing.");
    expect(ladder[0]!.task).toBe("Implement the thing.");
  });

  it("simpler and simplest still contain the original task plus a simplification instruction", () => {
    const ladder = buildDegradationLadder("Implement the thing.");
    expect(ladder[1]!.task).toContain("Implement the thing.");
    expect(ladder[1]!.task).toMatch(/simplify/i);
    expect(ladder[2]!.task).toContain("Implement the thing.");
    expect(ladder[2]!.task).toMatch(/minimal/i);
  });

  it("simplest is strictly more reductive than simpler — a distinct instruction, not a repeat", () => {
    const ladder = buildDegradationLadder("Implement the thing.");
    expect(ladder[2]!.task).not.toBe(ladder[1]!.task);
  });

  it("omit has no task — there is nothing left to attempt", () => {
    const ladder = buildDegradationLadder("Implement the thing.");
    expect(ladder[3]!.task).toBeNull();
  });
});

describe("describeDegradation (AI-7) — user-facing copy", () => {
  const DENYLIST = [
    "error",
    "fail",
    "exception",
    "crash",
    "bug",
    "stack trace",
    "undefined",
    "null",
    "exit code",
    "typescript",
    "tsc",
    "TS2322",
  ];

  it.each(["simpler", "simplest", "omit"] as const)(
    "the %s message contains none of the denylisted error terms",
    (level) => {
      const message = describeDegradation(level, "the checkout page");
      const lower = message.toLowerCase();
      for (const term of DENYLIST) {
        expect(lower).not.toContain(term.toLowerCase());
      }
    },
  );

  it("describes the outcome, not the failure — mentions the unit by name", () => {
    expect(describeDegradation("simpler", "the checkout page")).toContain(
      "the checkout page",
    );
    expect(describeDegradation("omit", "the checkout page")).toContain(
      "the checkout page",
    );
  });

  it("full is a distinct, non-degraded message", () => {
    const message = describeDegradation("full", "the checkout page");
    expect(message).not.toMatch(/simplif|minimal|skipped/i);
  });
});

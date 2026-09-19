import { describe, expect, it } from "vitest";
import { applyBudget, type BudgetCandidate } from "./budget";

function candidate(
  path: string,
  relevance: number,
  size: number,
): BudgetCandidate {
  return { path, relevance, contents: "x".repeat(size) };
}

describe("applyBudget (AI-4)", () => {
  it("keeps everything when it fits under budget", () => {
    const candidates = [candidate("a.ts", 3, 40), candidate("b.ts", 2, 40)];
    const { kept, omitted } = applyBudget(candidates, 1000);
    expect(kept.map((c) => c.path)).toEqual(["a.ts", "b.ts"]);
    expect(omitted).toEqual([]);
  });

  it("drops the least-relevant candidates first when oversized", () => {
    // Each candidate is ~1000 tokens (4000 chars / 4). A 1500-token budget
    // fits exactly one.
    const candidates = [
      candidate("most-relevant.ts", 3, 4000),
      candidate("middle.ts", 2, 4000),
      candidate("least-relevant.ts", 1, 4000),
    ];

    const { kept, omitted } = applyBudget(candidates, 1500);

    expect(kept.map((c) => c.path)).toEqual(["most-relevant.ts"]);
    expect(omitted).toEqual(["least-relevant.ts", "middle.ts"]);
  });

  it("never omits everything — the single most relevant candidate is kept even if it alone exceeds budget", () => {
    const candidates = [candidate("huge.ts", 5, 1_000_000)];
    const { kept, omitted } = applyBudget(candidates, 10);
    expect(kept.map((c) => c.path)).toEqual(["huge.ts"]);
    expect(omitted).toEqual([]);
  });

  it("breaks a relevance tie by path for determinism", () => {
    const candidates = [candidate("b.ts", 1, 10), candidate("a.ts", 1, 10)];
    const { kept } = applyBudget(candidates, 1000);
    expect(kept.map((c) => c.path)).toEqual(["a.ts", "b.ts"]);
  });
});

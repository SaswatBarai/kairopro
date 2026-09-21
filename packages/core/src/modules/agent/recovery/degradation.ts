/**
 * The degradation ladder (Phase 17 / AI-7): full → simpler → simplest →
 * omit. Only ever walked for a unit `rules.ts` says is degradable — see
 * `fix-loop.ts`, the only caller. Each step rewrites the *task* handed to
 * the next generation attempt; `omit` is terminal and produces no task at
 * all (the unit is skipped, not attempted a fifth way).
 */

export const DEGRADATION_LADDER = [
  "full",
  "simpler",
  "simplest",
  "omit",
] as const;

export type DegradationLevel = (typeof DEGRADATION_LADDER)[number];

export interface DegradationStep {
  level: DegradationLevel;
  /** The rewritten task for this level, or `null` at `"omit"` — there is
   * nothing left to attempt. */
  task: string | null;
}

/** Builds the full ladder for one unit's original task. Pure — the same
 * input always produces the same ladder, so a caller can log which level
 * it's on without re-deriving the text. */
export function buildDegradationLadder(
  originalTask: string,
): DegradationStep[] {
  return [
    { level: "full", task: originalTask },
    {
      level: "simpler",
      task: [
        originalTask,
        "",
        "Simplify: implement only the core requirement. Omit optional",
        "polish, secondary features, and edge-case handling that isn't",
        "required for correctness.",
      ].join("\n"),
    },
    {
      level: "simplest",
      task: [
        originalTask,
        "",
        "Minimal implementation only: satisfy the required type/interface",
        "with the simplest possible correct behavior. No optional",
        "features, no styling beyond what's structurally required.",
      ].join("\n"),
    },
    { level: "omit", task: null },
  ];
}

/**
 * User-facing copy for a degradation outcome — describes what happened to
 * the *unit*, never the underlying failure. No error terms, no stack
 * traces, no tool names: a user reading this should understand the
 * trade-off made on their behalf, not that something broke.
 */
export function describeDegradation(
  level: DegradationLevel,
  unitName: string,
): string {
  switch (level) {
    case "full":
      return `${unitName} was generated as specified.`;
    case "simpler":
      return `${unitName} was simplified to keep the build moving — some optional details were left out.`;
    case "simplest":
      return `${unitName} was generated in a minimal form. You can refine it further later.`;
    case "omit":
      return `${unitName} was skipped for this build. You can add it yourself or retry later.`;
  }
}

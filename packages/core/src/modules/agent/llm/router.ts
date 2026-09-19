/**
 * router.ts — phase → model map (Phase 7 / AI-1). This is the **only**
 * place a model name appears anywhere in the codebase; every call site
 * asks for a model by workflow phase, never by name.
 *
 * The primary provider is still undecided (plan §0, "Primary LLM
 * provider: Mock-first") — these defaults are placeholders for the mock
 * provider and get tuned once a concrete provider lands (Open Items).
 */

export const WORKFLOW_PHASES = [
  "pm-questions",
  "prd",
  "design",
  "data-model",
  "app-structure",
  "code-gen",
  "fix",
] as const;

export type WorkflowPhase = (typeof WORKFLOW_PHASES)[number];

const MODEL_BY_PHASE: Record<WorkflowPhase, string> = {
  "pm-questions": "claude-sonnet-5",
  prd: "claude-sonnet-5",
  design: "claude-sonnet-5",
  "data-model": "claude-sonnet-5",
  "app-structure": "claude-sonnet-5",
  "code-gen": "claude-sonnet-5",
  fix: "claude-sonnet-5",
};

/** Throws for any phase name not in `WORKFLOW_PHASES` — including a value
 * that only satisfies the `WorkflowPhase` type at compile time but arrives
 * as an untrusted string at runtime. */
export function modelFor(phase: WorkflowPhase): string {
  const model = MODEL_BY_PHASE[phase];
  if (!model) {
    throw new Error(`No model mapped for workflow phase "${String(phase)}"`);
  }
  return model;
}

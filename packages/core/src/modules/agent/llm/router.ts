/**
 * router.ts — phase → model map (Phase 7 / AI-1). This is the **only**
 * place a model name appears anywhere in the codebase; every call site
 * asks for a model by workflow phase, never by name.
 *
 * Provider decision (Open Items, resolved): Together AI, model
 * `zai-org/GLM-5.3-Flash` — cheap, vision-capable, 1M-token context,
 * confirmed live against the real API. Every phase uses it today; split
 * phases onto different models here if cost/quality data later calls for it.
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

const DEFAULT_MODEL = "zai-org/GLM-5.3-Flash";

const MODEL_BY_PHASE: Record<WorkflowPhase, string> = {
  "pm-questions": DEFAULT_MODEL,
  prd: DEFAULT_MODEL,
  design: DEFAULT_MODEL,
  "data-model": DEFAULT_MODEL,
  "app-structure": DEFAULT_MODEL,
  "code-gen": DEFAULT_MODEL,
  fix: DEFAULT_MODEL,
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

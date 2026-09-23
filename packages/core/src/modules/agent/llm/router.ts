/**
 * router.ts — phase → model map (Phase 7 / AI-1). This is the **only**
 * place a model name appears anywhere in the codebase; every call site
 * asks for a model by workflow phase, never by name.
 *
 * Provider decision, revised: Anthropic, model `claude-haiku-4-5` — chosen
 * for speed over the previous Together model (`zai-org/GLM-5.3-Flash`),
 * which was a reasoning model that had to have its provider's
 * `DEFAULT_MAX_TOKENS`/`DEFAULT_TIMEOUT_MS` raised repeatedly (see
 * `providers/together.ts`'s history) to survive its own "thinking" token
 * spend on real structured-generation prompts. Haiku 4.5 is called here
 * with no extended thinking requested, confirmed live against the real
 * API. Together AI (`providers/together.ts`) is kept as an automatic
 * fallback in `llm/index.ts`'s selector, not deleted, in case Anthropic is
 * ever unconfigured.
 */

export const WORKFLOW_PHASES = [
  "pm-questions",
  "prd",
  "design",
  "data-model",
  "app-structure",
  "code-gen",
  "fix",
  "test-gen",
  "change",
] as const;

export type WorkflowPhase = (typeof WORKFLOW_PHASES)[number];

const DEFAULT_MODEL = "claude-haiku-4-5";

const MODEL_BY_PHASE: Record<WorkflowPhase, string> = {
  "pm-questions": DEFAULT_MODEL,
  prd: DEFAULT_MODEL,
  design: DEFAULT_MODEL,
  "data-model": DEFAULT_MODEL,
  "app-structure": DEFAULT_MODEL,
  "code-gen": DEFAULT_MODEL,
  fix: DEFAULT_MODEL,
  "test-gen": DEFAULT_MODEL,
  change: DEFAULT_MODEL,
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

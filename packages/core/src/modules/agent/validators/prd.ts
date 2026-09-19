import { z } from "zod";

/**
 * PRD content schema (Phase 11 / AI-5) — shared with BE-6: `spec.service`
 * treats `Spec.content` as opaque JSON, so this is the only place a PRD's
 * shape is enforced, both for the generator's retry loop and for anything
 * that reads a PRD spec back out.
 *
 * The business-rules section is structured, not prose — six required
 * subsections, each real data a downstream step (data model, app
 * structure, and eventually the test agent) can walk, not just read.
 */

export const PrdPersonaSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

export const PrdUserStorySchema = z.object({
  persona: z.string().min(1),
  story: z.string().min(1),
});

/** Ties an assumption back to the pm-question that went unanswered. */
export const PrdAssumptionSchema = z.object({
  questionId: z.string().min(1),
  assumption: z.string().min(1),
});

export const PrdStateTransitionSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  trigger: z.string().optional(),
});

export const PrdStateMachineSchema = z.object({
  entity: z.string().min(1),
  states: z.array(z.string().min(1)).min(1),
  transitions: z.array(PrdStateTransitionSchema),
});

export const PrdPermissionRuleSchema = z.object({
  role: z.string().min(1),
  entity: z.string().min(1),
  actions: z.array(z.string().min(1)).min(1),
});

export const PrdBusinessRulesSchema = z.object({
  invariants: z.array(z.string().min(1)).min(1),
  stateMachine: z.array(PrdStateMachineSchema).min(1),
  permissionMatrix: z.array(PrdPermissionRuleSchema).min(1),
  validationRules: z.array(z.string().min(1)).min(1),
  /** A real business may have none — the model must say so explicitly
   * ("N/A — no monetary values") rather than the array being empty. */
  moneyRules: z.array(z.string().min(1)).min(1),
  sideEffects: z.array(z.string().min(1)).min(1),
});

export const PrdContentSchema = z.object({
  overview: z.string().min(1),
  goals: z.array(z.string().min(1)).min(1),
  nonGoals: z.array(z.string().min(1)),
  personas: z.array(PrdPersonaSchema).min(1),
  userStories: z.array(PrdUserStorySchema).min(1),
  assumptions: z.array(PrdAssumptionSchema),
  businessRules: PrdBusinessRulesSchema,
});

export type PrdPersona = z.infer<typeof PrdPersonaSchema>;
export type PrdUserStory = z.infer<typeof PrdUserStorySchema>;
export type PrdAssumption = z.infer<typeof PrdAssumptionSchema>;
export type PrdStateMachine = z.infer<typeof PrdStateMachineSchema>;
export type PrdPermissionRule = z.infer<typeof PrdPermissionRuleSchema>;
export type PrdBusinessRules = z.infer<typeof PrdBusinessRulesSchema>;
export type PrdContent = z.infer<typeof PrdContentSchema>;

/**
 * Wraps `PrdContentSchema` with an assumption-coverage check: every
 * unanswered pm-question id in `requiredAssumptionIds` must have a
 * matching entry in `assumptions`. This is what turns "unanswered
 * questions become labeled assumptions" from a prompt instruction into an
 * enforced, retriable contract.
 */
export function prdContentSchemaWithAssumptions(
  requiredAssumptionIds: readonly string[],
) {
  if (requiredAssumptionIds.length === 0) return PrdContentSchema;
  return PrdContentSchema.refine(
    (content) => {
      const covered = new Set(content.assumptions.map((a) => a.questionId));
      return requiredAssumptionIds.every((id) => covered.has(id));
    },
    {
      message: `assumptions must include an entry for every unanswered question: ${requiredAssumptionIds.join(", ")}`,
      path: ["assumptions"],
    },
  );
}

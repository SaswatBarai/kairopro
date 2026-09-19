import type { PmQuestion } from "@kairopro/contracts";
import type { RequestContext } from "../../../../lib/context";
import { getLLMProvider } from "../../llm";
import type { LLMProvider } from "../../llm/provider";
import { modelFor } from "../../llm/router";
import { completeStructured } from "../../llm/structured";
import { renderPrompt } from "../../prompts/loader";
import {
  prdContentSchemaWithAssumptions,
  type PrdContent,
} from "../../validators/prd";

/**
 * generate-prd workflow step (Phase 11 / AI-5). Every unanswered
 * pm-question is fed in by id; the response schema requires an assumption
 * entry for each one, so a PRD that silently drops an unanswered question
 * fails validation and retries rather than shipping incomplete.
 */

export interface GeneratePrdInput {
  projectDescription: string;
  /** questionId → answer text, for questions the user did answer. */
  answers: Record<string, string>;
  /** The full question set — used to render both the answered and
   * unanswered sections of the prompt. */
  questions: PmQuestion[];
  ctx: RequestContext;
  projectId?: string;
  provider?: LLMProvider;
}

/**
 * Renders a generated `PrdContent` back to the markdown-ish text the
 * design/data-model/app-structure prompts' `{{prd}}` placeholder expects.
 * The PRD itself is structured JSON (so downstream steps can enforce real
 * contracts against it); this is the one place it becomes prose again.
 */
export function formatPrdForPrompt(content: PrdContent): string {
  const rules = content.businessRules;
  const lines: string[] = [
    "# Overview",
    content.overview,
    "",
    "## Goals",
    ...content.goals.map((g) => `- ${g}`),
    "",
    "## Personas",
    ...content.personas.map((p) => `- **${p.name}**: ${p.description}`),
    "",
    "## User Stories",
    ...content.userStories.map((s) => `- (${s.persona}) ${s.story}`),
    "",
    "## Business Rules",
    "### Invariants",
    ...rules.invariants.map((r) => `- ${r}`),
    "### State Machine",
    ...rules.stateMachine.map(
      (m) =>
        `- ${m.entity}: ${m.states.join(" → ")}` +
        (m.transitions.length
          ? ` (${m.transitions.map((t) => `${t.from}→${t.to}`).join(", ")})`
          : ""),
    ),
    "### Permission Matrix",
    ...rules.permissionMatrix.map(
      (p) => `- ${p.role} on ${p.entity}: ${p.actions.join(", ")}`,
    ),
    "### Validation Rules",
    ...rules.validationRules.map((r) => `- ${r}`),
    "### Money Rules",
    ...rules.moneyRules.map((r) => `- ${r}`),
    "### Side Effects",
    ...rules.sideEffects.map((r) => `- ${r}`),
  ];
  return lines.join("\n");
}

export async function generatePrd(
  input: GeneratePrdInput,
): Promise<PrdContent> {
  const provider = input.provider ?? getLLMProvider();
  const model = modelFor("prd");

  const unanswered = input.questions.filter((q) => !(q.id in input.answers));
  const answered = input.questions.filter((q) => q.id in input.answers);

  const pmAnswers =
    answered.length > 0
      ? answered
          .map((q) => `- [${q.id}] ${q.question}: ${input.answers[q.id]}`)
          .join("\n")
      : "(no questions were answered)";

  const assumptions =
    unanswered.length > 0
      ? unanswered
          .map((q) => `- [${q.id}] ${q.question} (unanswered)`)
          .join("\n")
      : "(every question was answered)";

  const schema = prdContentSchemaWithAssumptions(unanswered.map((q) => q.id));

  return completeStructured({
    provider,
    model,
    schema,
    messages: [
      { role: "system", content: renderPrompt("system") },
      {
        role: "user",
        content: renderPrompt("prd", {
          projectDescription: input.projectDescription,
          pmAnswers,
          assumptions,
        }),
      },
    ],
    ctx: input.ctx,
    refs: { projectId: input.projectId },
  });
}

import { z } from "zod";
import { PmQuestionsSchema, type PmQuestions } from "@kairopro/contracts";
import type { RequestContext } from "../../../../lib/context";
import { getLLMProvider } from "../../llm";
import { modelFor } from "../../llm/router";
import { completeStructured } from "../../llm/structured";
import { renderPrompt } from "../../prompts/loader";
import type { LLMProvider } from "../../llm/provider";

/**
 * pm-questions workflow step (Phase 11 / AI-5). Asks 3–5 architecture-only
 * clarifying questions about the project description — never about visual
 * design, copy, or wording.
 */

/** Design/content language a question or its options must never use — this
 * is the "architecture-relevant only" rule enforced at runtime, not just as
 * a prompt instruction: a violating response is rejected and retried. */
const DESIGN_DENYLIST = [
  "color",
  "colour",
  "font",
  "typography",
  "logo",
  "layout",
  "copy",
  "wording",
  "label",
  "image",
  "icon",
  "theme",
  "style",
  "palette",
];

function containsDesignLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return DESIGN_DENYLIST.some((term) =>
    new RegExp(`\\b${term}\\b`).test(lower),
  );
}

const PmQuestionsWithDenylistSchema = PmQuestionsSchema.refine(
  (questions) =>
    !questions.some(
      (q) =>
        containsDesignLanguage(q.question) ||
        q.options.some((option) => containsDesignLanguage(option)),
    ),
  {
    message:
      "a question or option used design/content language (denylisted) — only architecture-relevant questions are allowed",
  },
);

export interface GeneratePmQuestionsInput {
  projectDescription: string;
  ctx: RequestContext;
  projectId?: string;
  provider?: LLMProvider;
}

export async function generatePmQuestions(
  input: GeneratePmQuestionsInput,
): Promise<PmQuestions> {
  const provider = input.provider ?? getLLMProvider();
  const model = modelFor("pm-questions");

  return completeStructured({
    provider,
    model,
    schema: PmQuestionsWithDenylistSchema as z.ZodType<PmQuestions>,
    messages: [
      { role: "system", content: renderPrompt("system") },
      {
        role: "user",
        content: renderPrompt("pm-questions", {
          projectDescription: input.projectDescription,
        }),
      },
    ],
    ctx: input.ctx,
    refs: { projectId: input.projectId },
  });
}

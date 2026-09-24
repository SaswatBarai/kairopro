import { z } from "zod";
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
 * revise-prd workflow step: applies one natural-language change to an
 * existing PRD. Unlike `generatePrd` there is no pm-question set to cover —
 * the equivalent guarantee here is that no assumption already on the PRD is
 * dropped, which `prdContentSchemaWithAssumptions` enforces (and retries on)
 * by requiring every existing `questionId` to survive the edit.
 */

export interface RevisePrdInput {
  currentPrd: PrdContent;
  instruction: string;
  ctx: RequestContext;
  projectId?: string;
  provider?: LLMProvider;
}

export interface RevisePrdResult {
  /** Plain-language description of what changed, addressed to the user. */
  summary: string;
  prd: PrdContent;
}

export async function revisePrd(
  input: RevisePrdInput,
): Promise<RevisePrdResult> {
  const provider = input.provider ?? getLLMProvider();
  const model = modelFor("revise-prd");

  const schema = z.object({
    summary: z.string().min(1),
    prd: prdContentSchemaWithAssumptions(
      input.currentPrd.assumptions.map((a) => a.questionId),
    ),
  });

  return completeStructured({
    provider,
    model,
    schema,
    messages: [
      { role: "system", content: renderPrompt("system") },
      {
        role: "user",
        content: renderPrompt("revise-prd", {
          currentPrd: JSON.stringify(input.currentPrd, null, 2),
          instruction: input.instruction,
        }),
      },
    ],
    ctx: input.ctx,
    refs: { projectId: input.projectId },
  });
}

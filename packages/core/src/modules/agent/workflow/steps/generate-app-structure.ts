import type { RequestContext } from "../../../../lib/context";
import { getLLMProvider } from "../../llm";
import type { LLMProvider } from "../../llm/provider";
import { modelFor } from "../../llm/router";
import { completeStructured } from "../../llm/structured";
import { renderPrompt } from "../../prompts/loader";
import {
  AppStructureContentSchema,
  type AppStructureContent,
} from "../../validators/app-structure";

/**
 * generate-app-structure workflow step (Phase 11 / AI-5). Every endpoint's
 * `requestType`/`responseType` are required, non-empty fields in
 * `AppStructureContentSchema` — an endpoint missing either fails schema
 * validation and retries, which is the entire enforcement of "every
 * endpoint has both a request and a response type."
 */

export interface GenerateAppStructureInput {
  prd: string;
  dataModel: string;
  ctx: RequestContext;
  projectId?: string;
  provider?: LLMProvider;
}

export async function generateAppStructure(
  input: GenerateAppStructureInput,
): Promise<AppStructureContent> {
  const provider = input.provider ?? getLLMProvider();
  const model = modelFor("app-structure");

  return completeStructured({
    provider,
    model,
    schema: AppStructureContentSchema,
    messages: [
      { role: "system", content: renderPrompt("system") },
      {
        role: "user",
        content: renderPrompt("app-structure", {
          prd: input.prd,
          dataModel: input.dataModel,
        }),
      },
    ],
    ctx: input.ctx,
    refs: { projectId: input.projectId },
  });
}

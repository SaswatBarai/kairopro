import type { RequestContext } from "../../../../lib/context";
import {
  parseDesignDocument,
  exportDesignDocument,
} from "../../../design/design.service";
import { getLLMProvider } from "../../llm";
import type { LLMProvider } from "../../llm/provider";
import { modelFor } from "../../llm/router";
import { completeWithValidator } from "../../llm/structured";
import { renderPrompt } from "../../prompts/loader";

/**
 * generate-design workflow step (Phase 11 / AI-5). Output is a `DESIGN.md`
 * document (YAML token frontmatter + markdown), not JSON — so this uses
 * `completeWithValidator`, not `completeStructured`. Validation is real:
 * the document must parse, carry non-empty tokens, and actually export to
 * non-empty CSS — "the design output must be tokens, not prose."
 */

export interface GenerateDesignInput {
  prd: string;
  /** Reference/logo/preset notes, if any — empty string produces a
   * complete token set anyway (never left incomplete for lack of input). */
  referenceNotes?: string;
  ctx: RequestContext;
  projectId?: string;
  provider?: LLMProvider;
}

async function validateDesignDocument(content: string): Promise<string> {
  const trimmed = content.trim();
  const doc = parseDesignDocument(trimmed);
  if (!doc.tokens || Object.keys(doc.tokens).length === 0) {
    throw new Error(
      "DESIGN.md must include non-empty YAML token frontmatter, not prose",
    );
  }

  const css = await exportDesignDocument(trimmed, "css-tailwind");
  if (!css.includes("@theme")) {
    throw new Error("Design export did not produce a non-empty @theme block");
  }

  return trimmed;
}

export async function generateDesign(
  input: GenerateDesignInput,
): Promise<string> {
  const provider = input.provider ?? getLLMProvider();
  const model = modelFor("design");

  return completeWithValidator({
    provider,
    model,
    messages: [
      { role: "system", content: renderPrompt("system") },
      {
        role: "user",
        content: renderPrompt("design", {
          prd: input.prd,
          referenceNotes: input.referenceNotes ?? "",
        }),
      },
    ],
    ctx: input.ctx,
    refs: { projectId: input.projectId },
    validate: validateDesignDocument,
  });
}

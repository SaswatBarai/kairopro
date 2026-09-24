import { isDeepStrictEqual } from "node:util";
import type { Spec, SpecChangeResult } from "@kairopro/contracts";
import type { RequestContext } from "../../lib/context";
import { NotFoundError, ProviderError } from "../../lib/errors";
import { eventBus } from "../../platform/events";
import { listInputs } from "../input/input.service";
import {
  formatPrdForPrompt,
  generatePrd,
} from "../agent/workflow/steps/generate-prd";
import { generateAppStructure } from "../agent/workflow/steps/generate-app-structure";
import { generateDataModel } from "../agent/workflow/steps/generate-data-model";
import { generateDesign } from "../agent/workflow/steps/generate-design";
import { generatePmQuestions } from "../agent/workflow/steps/pm-questions";
import { revisePrd } from "../agent/workflow/steps/revise-prd";
import { PrdContentSchema } from "../agent/validators/prd";
import { createSpec, listSpecs } from "./spec.service";

/**
 * Real spec generator (Phase 11 / AI-5) — replaces the Phase 6 stub. Runs
 * pm-questions → PRD → design → data-model → app-structure in one pass,
 * publishing progress on `spec-generation:${projectId}` at each step.
 *
 * There is no interactive "submit pm-question answers" route yet — that's
 * a product surface beyond this phase's listed deliverables (workflow
 * steps, validators, and this route integration). Every question is
 * therefore treated as unanswered, which the PRD step already handles
 * correctly: each becomes an explicit, labeled assumption rather than a
 * silently-skipped question. Wiring a real answer-collection step later
 * only changes what `answers` this generator passes to `generatePrd` — the
 * steps themselves don't change.
 */
export interface SpecGenerator {
  generate(projectId: string, ctx: RequestContext): Promise<void>;
  /** Applies a natural-language change to the current PRD, then regenerates
   * the data model and app structure from the revised PRD. */
  revise(
    projectId: string,
    instruction: string,
    ctx: RequestContext,
  ): Promise<SpecChangeResult>;
}

type ProgressStatus = "started" | "completed" | "failed";

function publishProgress(
  projectId: string,
  step: string,
  status: ProgressStatus,
  message?: string,
): void {
  eventBus.publish(`spec-generation:${projectId}`, {
    projectId,
    step,
    status,
    message,
    createdAt: new Date().toISOString(),
  });
}

async function withProgress<T>(
  projectId: string,
  step: string,
  run: () => Promise<T>,
): Promise<T> {
  publishProgress(projectId, step, "started");
  try {
    const result = await run();
    publishProgress(projectId, step, "completed");
    return result;
  } catch (cause) {
    publishProgress(
      projectId,
      step,
      "failed",
      cause instanceof Error ? cause.message : String(cause),
    );
    throw cause;
  }
}

async function buildProjectDescription(
  projectId: string,
  ctx: RequestContext,
): Promise<string> {
  const inputs = await listInputs(projectId, ctx);
  const parts = inputs
    .map((input) => input.extraction)
    .filter((text): text is string => Boolean(text?.trim()));

  if (parts.length === 0) {
    throw new ProviderError({
      message:
        "This project has no usable input yet — add requirements text or a file before generating specs",
    });
  }
  return parts.join("\n\n---\n\n");
}

export const RealSpecGenerator: SpecGenerator = {
  async generate(projectId, ctx) {
    const projectDescription = await buildProjectDescription(projectId, ctx);

    const questions = await withProgress(projectId, "pm-questions", () =>
      generatePmQuestions({ projectDescription, ctx, projectId }),
    );

    const prd = await withProgress(projectId, "prd", () =>
      generatePrd({
        projectDescription,
        answers: {},
        questions,
        ctx,
        projectId,
      }),
    );
    await createSpec(projectId, "PRD", prd, ctx);
    const prdText = formatPrdForPrompt(prd);

    const design = await withProgress(projectId, "design", () =>
      generateDesign({ prd: prdText, ctx, projectId }),
    );
    await createSpec(projectId, "DESIGN", { markdown: design }, ctx);

    const dataModel = await withProgress(projectId, "data-model", () =>
      generateDataModel({ prd: prdText, ctx, projectId }),
    );
    await createSpec(projectId, "DATA_MODEL", { schema: dataModel }, ctx);

    const appStructure = await withProgress(projectId, "app-structure", () =>
      generateAppStructure({ prd: prdText, dataModel, ctx, projectId }),
    );
    await createSpec(projectId, "APP_STRUCTURE", appStructure, ctx);
  },

  async revise(projectId, instruction, ctx) {
    const currentSpec = (await listSpecs(projectId, ctx)).find(
      (s) => s.type === "PRD",
    );
    if (!currentSpec) {
      throw new NotFoundError({
        message: "There is no PRD to change yet — generate the specs first",
      });
    }
    const currentPrd = PrdContentSchema.parse(currentSpec.content);

    const { summary, prd } = await withProgress(projectId, "revise-prd", () =>
      revisePrd({ currentPrd, instruction, ctx, projectId }),
    );

    // A request that isn't a requirements change (a question, small talk)
    // comes back with the PRD untouched — don't burn two more LLM calls and
    // three new versions to reproduce what already exists.
    if (isDeepStrictEqual(prd, currentPrd)) {
      return { summary, specs: [] };
    }

    // Generate everything before writing anything: a failure in the data
    // model or app structure must not leave a new PRD sitting next to specs
    // derived from the old one.
    const prdText = formatPrdForPrompt(prd);
    const dataModel = await withProgress(projectId, "data-model", () =>
      generateDataModel({ prd: prdText, ctx, projectId }),
    );
    const appStructure = await withProgress(projectId, "app-structure", () =>
      generateAppStructure({ prd: prdText, dataModel, ctx, projectId }),
    );

    const specs: Spec[] = [
      await createSpec(projectId, "PRD", prd, ctx),
      await createSpec(projectId, "DATA_MODEL", { schema: dataModel }, ctx),
      await createSpec(projectId, "APP_STRUCTURE", appStructure, ctx),
    ];
    return { summary, specs };
  },
};

export function getSpecGenerator(): SpecGenerator {
  return RealSpecGenerator;
}

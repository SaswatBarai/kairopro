import type { RequestContext } from "../../../../lib/context";
import { ProviderError } from "../../../../lib/errors";
import { findApprovedSpecsByTypes } from "../../../spec/spec.repository";
import type { AppStructureContent } from "../../validators/app-structure";
import { AppStructureContentSchema } from "../../validators/app-structure";
import { DataModelContentSchema } from "../../validators/data-model";
import { DesignContentSchema } from "../../validators/design";
import type { PrdContent } from "../../validators/prd";
import { PrdContentSchema } from "../../validators/prd";
import { formatPrdForPrompt } from "./generate-prd";

/**
 * Approved-spec loading and prompt rendering (Phase 16 / AI-6). Template
 * conventions live in `../../template` instead — that module is
 * deliberately free of the database/LLM imports this one pulls in, so
 * resolving a template's skeleton path (`scaffold.ts`) never needs a
 * database connection.
 */

export interface ApprovedSpecs {
  prd: PrdContent;
  design: string;
  dataModel: string;
  appStructure: AppStructureContent;
}

const REQUIRED_SPECS = [
  "PRD",
  "DESIGN",
  "DATA_MODEL",
  "APP_STRUCTURE",
] as const;

/** Which of the four specs a build needs have no approved version. */
export async function findMissingApprovals(
  projectId: string,
): Promise<Array<(typeof REQUIRED_SPECS)[number]>> {
  const rows = await findApprovedSpecsByTypes(projectId, [...REQUIRED_SPECS]);
  const approved = new Set(rows.map((row) => row.type));
  return REQUIRED_SPECS.filter((type) => !approved.has(type));
}

/** Loads and validates the project's four approved specs — throws
 * `ProviderError` naming whichever is missing, since generation cannot
 * proceed without all four (the same reasoning `buildProjectDescription`
 * uses for input text in `spec/generator.ts`). */
export async function loadApprovedSpecs(
  projectId: string,
  _ctx: RequestContext,
): Promise<ApprovedSpecs> {
  const rows = await findApprovedSpecsByTypes(projectId, [
    "PRD",
    "DESIGN",
    "DATA_MODEL",
    "APP_STRUCTURE",
  ]);
  const byType = new Map(rows.map((row) => [row.type, row.content]));

  const missing = (
    ["PRD", "DESIGN", "DATA_MODEL", "APP_STRUCTURE"] as const
  ).filter((type) => !byType.has(type));
  if (missing.length > 0) {
    throw new ProviderError({
      message: `Code generation requires every spec to be approved first; missing: ${missing.join(", ")}`,
      details: { projectId, missing },
    });
  }

  const prd = PrdContentSchema.parse(byType.get("PRD"));
  const design = DesignContentSchema.parse(byType.get("DESIGN"));
  const dataModel = DataModelContentSchema.parse(byType.get("DATA_MODEL"));
  const appStructure = AppStructureContentSchema.parse(
    byType.get("APP_STRUCTURE"),
  );

  return {
    prd,
    design: design.markdown,
    dataModel: dataModel.schema,
    appStructure,
  };
}

/** Renders the four specs into the `{{specs}}` block every generation
 * prompt embeds — the same content for every file, so no generated file
 * can invent an API shape the app-structure spec didn't name. */
export function renderSpecsForPrompt(specs: ApprovedSpecs): string {
  return [
    "# Product Requirements",
    formatPrdForPrompt(specs.prd),
    "",
    "# Design",
    specs.design,
    "",
    "# Data Model (Prisma)",
    "```prisma",
    specs.dataModel,
    "```",
    "",
    "# App Structure",
    "## Pages",
    ...specs.appStructure.pages.map(
      (p) => `- ${p.route} (${p.personas.join(", ")})`,
    ),
    "## Endpoints",
    ...specs.appStructure.endpoints.map(
      (e) =>
        `- ${e.method} ${e.path} — request: ${e.requestType}, response: ${e.responseType}`,
    ),
    "## Components",
    ...specs.appStructure.components.map(
      (c) => `- ${c.name}: ${c.responsibility}`,
    ),
  ].join("\n");
}

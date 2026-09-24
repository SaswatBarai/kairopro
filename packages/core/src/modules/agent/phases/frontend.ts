import type { RequestContext } from "../../../lib/context";
import type { ContainerRuntime } from "../../../platform/container/runtime";
import type { WorkspaceStore } from "../../../platform/workspace/store";
import type { LLMProvider } from "../llm/provider";
import type { DegradationLevel } from "../recovery/degradation";
import { renderConventions, type TemplateManifest } from "../template";
import type { AppStructurePage } from "../validators/app-structure";
import {
  generateFile,
  type CodeStreamEvent,
} from "../workflow/steps/generate-code";
import type { OnStage } from "./stages";
import {
  renderSpecsForPrompt,
  type ApprovedSpecs,
} from "../workflow/steps/generation-context";

/**
 * Frontend phase (Phase 16 / AI-6, repair via Phase 17 / AI-7): pages.
 * Runs after `runBackendPhase`, so the frozen contracts and the auth
 * configuration it consumes already exist (auth moved to the backend phase:
 * routes import it, so it has to exist before they are generated).
 *
 * Pages are tagged `"layout"` — presentational, degradable.
 */

export interface RunFrontendPhaseInput {
  projectId: string;
  buildId?: string;
  ctx: RequestContext;
  workspace: WorkspaceStore;
  runtime: ContainerRuntime;
  containerId: string;
  cwd?: string;
  template: TemplateManifest;
  specs: ApprovedSpecs;
  provider?: LLMProvider;
  /** Checked before every file boundary (each page). */
  checkCancelled?: () => Promise<boolean>;
  onDegrade?: (
    unit: string,
    step: { level: DegradationLevel; message: string },
  ) => void;
  /** Live view of each file as it is written, tagged with its path. */
  onCode?: (unit: string, event: CodeStreamEvent) => void;
  /** Marks the `pages` stage starting and finishing. */
  onStage?: OnStage;
}

export type FrontendPhaseResult =
  | { status: "completed"; filesGenerated: string[]; omitted: string[] }
  | { status: "cancelled"; filesGenerated: string[]; omitted: string[] };

/** Exported for reuse by `phases/test-authoring.ts`'s e2e test cases,
 * which need the same route → file mapping to point at the page they
 * exercise — never re-derived, so the two can't drift apart. */
export function pageFilePath(
  template: TemplateManifest,
  route: string,
): string {
  const segments = route
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/^:([a-zA-Z0-9_]+)$/, "[$1]"));
  return [template.conventions.pagesDir, ...segments, "page.tsx"].join("/");
}

function pageTask(page: AppStructurePage, pagePath: string): string {
  return [
    `Implement the Next.js App Router page at ${pagePath} for the route`,
    `${page.route}, for these personas: ${page.personas.join(", ")}.`,
    "Import any request/response types and Zod schemas it needs from the",
    "frozen contracts module — never redefine them locally. Call the",
    "matching API route(s) named in the App Structure spec for this page's",
    "data, never a shape this spec doesn't name.",
  ].join("\n");
}

export async function runFrontendPhase(
  input: RunFrontendPhaseInput,
): Promise<FrontendPhaseResult> {
  const conventions = renderConventions(input.template);
  const specs = renderSpecsForPrompt(input.specs);
  const filesGenerated: string[] = [];
  const omitted: string[] = [];

  const cancelled = async () => {
    if (!input.checkCancelled) return false;
    return input.checkCancelled();
  };

  const stage = input.onStage ?? (() => {});

  stage("pages", "started");
  for (const page of input.specs.appStructure.pages) {
    if (await cancelled())
      return { status: "cancelled", filesGenerated, omitted };

    const pagePath = pageFilePath(input.template, page.route);
    const result = await generateFile({
      path: pagePath,
      task: pageTask(page, pagePath),
      conventions,
      specs,
      concern: "layout",
      projectId: input.projectId,
      buildId: input.buildId,
      ctx: input.ctx,
      workspace: input.workspace,
      runtime: input.runtime,
      containerId: input.containerId,
      cwd: input.cwd,
      provider: input.provider,
      onDegrade: input.onDegrade
        ? (step) => input.onDegrade!(pagePath, step)
        : undefined,
      onCode: input.onCode
        ? (event) => input.onCode!(pagePath, event)
        : undefined,
    });
    if (result.omitted) omitted.push(pagePath);
    else filesGenerated.push(pagePath);
  }
  stage("pages", "completed");

  return { status: "completed", filesGenerated, omitted };
}

import type { RequestContext } from "../../../lib/context";
import type { ContainerRuntime } from "../../../platform/container/runtime";
import type { WorkspaceStore } from "../../../platform/workspace/store";
import type { LLMProvider } from "../llm/provider";
import type { DegradationLevel } from "../recovery/degradation";
import { renderConventions, type TemplateManifest } from "../template";
import type { AppStructurePage } from "../validators/app-structure";
import { generateFile } from "../workflow/steps/generate-code";
import {
  renderSpecsForPrompt,
  type ApprovedSpecs,
} from "../workflow/steps/generation-context";

/**
 * Frontend phase (Phase 16 / AI-6, repair via Phase 17 / AI-7): pages →
 * auth configuration — the second half of "Generation order enforced:
 * schema → migrate → API routes → pages → auth configuration". Runs after
 * `runBackendPhase`, so the frozen contracts it consumes already exist.
 *
 * Pages are tagged `"layout"` — presentational, degradable. Auth
 * configuration is tagged `"authorization"` — never degradable; a fix
 * loop that can't get it right halts rather than shipping a simplified
 * permission model.
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
  /** Checked before every file boundary (each page, then auth config). */
  checkCancelled?: () => Promise<boolean>;
  onDegrade?: (
    unit: string,
    step: { level: DegradationLevel; message: string },
  ) => void;
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

function authTask(template: TemplateManifest): string {
  return [
    `Configure ${template.conventions.auth} and export it from`,
    `${template.conventions.authConfigPath}. Support the personas and`,
    "permission matrix described in the PRD above — every role listed",
    "there must be representable by the configuration you write. Do not",
    "invent a role or permission the PRD does not describe.",
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
    });
    if (result.omitted) omitted.push(pagePath);
    else filesGenerated.push(pagePath);
  }

  if (await cancelled())
    return { status: "cancelled", filesGenerated, omitted };
  const authPath = input.template.conventions.authConfigPath;
  const authResult = await generateFile({
    path: authPath,
    task: authTask(input.template),
    conventions,
    specs,
    concern: "authorization",
    projectId: input.projectId,
    buildId: input.buildId,
    ctx: input.ctx,
    workspace: input.workspace,
    runtime: input.runtime,
    containerId: input.containerId,
    cwd: input.cwd,
    provider: input.provider,
    onDegrade: input.onDegrade
      ? (step) => input.onDegrade!(authPath, step)
      : undefined,
  });
  if (authResult.omitted) omitted.push(authPath);
  else filesGenerated.push(authPath);

  return { status: "completed", filesGenerated, omitted };
}

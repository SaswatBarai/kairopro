import type { RequestContext } from "../../../lib/context";
import type { ContainerRuntime } from "../../../platform/container/runtime";
import type { WorkspaceStore } from "../../../platform/workspace/store";
import type { AppStructurePage } from "../validators/app-structure";
import type { LLMProvider } from "../llm/provider";
import { renderConventions, type TemplateManifest } from "../template";
import { generateFile } from "../workflow/steps/generate-code";
import {
  renderSpecsForPrompt,
  type ApprovedSpecs,
} from "../workflow/steps/generation-context";

/**
 * Frontend phase (Phase 16 / AI-6): pages → auth configuration — the
 * second half of "Generation order enforced: schema → migrate → API
 * routes → pages → auth configuration". Runs after `runBackendPhase`, so
 * the frozen contracts it consumes already exist.
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
}

export type FrontendPhaseResult =
  | { status: "completed"; filesGenerated: string[] }
  | { status: "cancelled"; filesGenerated: string[] };

function pageFilePath(template: TemplateManifest, route: string): string {
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

  const cancelled = async () => {
    if (!input.checkCancelled) return false;
    return input.checkCancelled();
  };

  for (const page of input.specs.appStructure.pages) {
    if (await cancelled()) return { status: "cancelled", filesGenerated };

    const pagePath = pageFilePath(input.template, page.route);
    await generateFile({
      path: pagePath,
      task: pageTask(page, pagePath),
      conventions,
      specs,
      projectId: input.projectId,
      buildId: input.buildId,
      ctx: input.ctx,
      workspace: input.workspace,
      runtime: input.runtime,
      containerId: input.containerId,
      cwd: input.cwd,
      provider: input.provider,
    });
    filesGenerated.push(pagePath);
  }

  if (await cancelled()) return { status: "cancelled", filesGenerated };
  await generateFile({
    path: input.template.conventions.authConfigPath,
    task: authTask(input.template),
    conventions,
    specs,
    projectId: input.projectId,
    buildId: input.buildId,
    ctx: input.ctx,
    workspace: input.workspace,
    runtime: input.runtime,
    containerId: input.containerId,
    cwd: input.cwd,
    provider: input.provider,
  });
  filesGenerated.push(input.template.conventions.authConfigPath);

  return { status: "completed", filesGenerated };
}

import type { RequestContext } from "../../../lib/context";
import { ProviderError } from "../../../lib/errors";
import type { ContainerRuntime } from "../../../platform/container/runtime";
import type { WorkspaceStore } from "../../../platform/workspace/store";
import type { AppStructureEndpoint } from "../validators/app-structure";
import type { LLMProvider } from "../llm/provider";
import { renderConventions, type TemplateManifest } from "../template";
import { validatePrismaSchema } from "../workflow/steps/generate-data-model";
import { freezeContracts } from "../workflow/steps/freeze-contracts";
import { generateFile } from "../workflow/steps/generate-code";
import {
  renderSpecsForPrompt,
  type ApprovedSpecs,
} from "../workflow/steps/generation-context";

/**
 * Backend phase (Phase 16 / AI-6): schema → migrate → freeze-contracts →
 * API routes — the first half of "Generation order enforced: schema →
 * migrate → API routes → pages → auth configuration". Each stage only
 * starts once the one before it succeeded; a schema failure throws before
 * a single route is generated.
 */

export interface RunBackendPhaseInput {
  projectId: string;
  buildId?: string;
  ctx: RequestContext;
  workspace: WorkspaceStore;
  runtime: ContainerRuntime;
  containerId: string;
  /** Container-side working directory the generated project lives in. */
  cwd?: string;
  template: TemplateManifest;
  specs: ApprovedSpecs;
  provider?: LLMProvider;
  /** Checked before every file boundary (schema, migrate, contracts, and
   * each route) — returning true stops the phase at that boundary. */
  checkCancelled?: () => Promise<boolean>;
}

export type BackendPhaseResult =
  | { status: "completed"; filesGenerated: string[]; contractsPath: string }
  | { status: "cancelled"; filesGenerated: string[] };

function routeFilePath(
  template: TemplateManifest,
  endpointPath: string,
): string {
  const withoutApiPrefix = endpointPath.replace(/^\/api\/?/, "");
  const segments = withoutApiPrefix
    .split("/")
    .filter(Boolean)
    // `:id` → `[id]` — Next.js App Router's dynamic-segment convention.
    .map((segment) => segment.replace(/^:([a-zA-Z0-9_]+)$/, "[$1]"));
  return [template.conventions.apiRoutesDir, ...segments, "route.ts"].join("/");
}

/** One or more endpoints sharing the same file — every HTTP method on the
 * same path is one Next.js route file, generated once, not once per method
 * (a second `generateFile` call at the same path would silently discard
 * the first method's handler). */
function groupEndpointsByFile(
  template: TemplateManifest,
  endpoints: AppStructureEndpoint[],
): Map<string, AppStructureEndpoint[]> {
  const groups = new Map<string, AppStructureEndpoint[]>();
  for (const endpoint of endpoints) {
    const path = routeFilePath(template, endpoint.path);
    const group = groups.get(path);
    if (group) group.push(endpoint);
    else groups.set(path, [endpoint]);
  }
  return groups;
}

function routeTask(
  routePath: string,
  endpoints: AppStructureEndpoint[],
): string {
  const lines = [
    `Implement the Next.js App Router route handler at ${routePath}.`,
    "It must export one async handler function per HTTP method below,",
    "named GET/POST/PUT/PATCH/DELETE to match. Import request/response",
    "types and their Zod schemas from the frozen contracts module — never",
    "redefine them locally.",
    "",
  ];
  for (const endpoint of endpoints) {
    lines.push(
      `- ${endpoint.method} ${endpoint.path}: request ${endpoint.requestType}, response ${endpoint.responseType}`,
    );
  }
  return lines.join("\n");
}

async function writeSchema(input: RunBackendPhaseInput): Promise<void> {
  const header = await input.workspace.readFile(
    input.projectId,
    input.template.conventions.prismaSchemaPath,
  );
  await validatePrismaSchema(input.specs.dataModel);
  const content = `${header.trimEnd()}\n\n${input.specs.dataModel.trim()}\n`;
  await input.workspace.writeFile(
    input.projectId,
    input.template.conventions.prismaSchemaPath,
    content,
  );
}

async function runMigrate(input: RunBackendPhaseInput): Promise<void> {
  const result = await input.runtime.exec({
    containerId: input.containerId,
    cmd: "npm install --no-audit --no-fund && npx prisma generate && npx prisma db push --skip-generate --accept-data-loss",
    cwd: input.cwd,
    timeoutMs: 300_000,
  });
  if (result.exitCode !== 0) {
    throw new ProviderError({
      message: "Database migration failed",
      details: {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      },
    });
  }
}

export async function runBackendPhase(
  input: RunBackendPhaseInput,
): Promise<BackendPhaseResult> {
  const conventions = renderConventions(input.template);
  const specs = renderSpecsForPrompt(input.specs);
  const filesGenerated: string[] = [];

  const cancelled = async () => {
    if (!input.checkCancelled) return false;
    return input.checkCancelled();
  };

  if (await cancelled()) return { status: "cancelled", filesGenerated };
  await writeSchema(input);
  filesGenerated.push(input.template.conventions.prismaSchemaPath);

  if (await cancelled()) return { status: "cancelled", filesGenerated };
  await runMigrate(input);

  if (await cancelled()) return { status: "cancelled", filesGenerated };
  await freezeContracts({
    projectId: input.projectId,
    buildId: input.buildId,
    ctx: input.ctx,
    workspace: input.workspace,
    runtime: input.runtime,
    containerId: input.containerId,
    cwd: input.cwd,
    conventions,
    specs,
    contractsPath: input.template.conventions.contractsPath,
    provider: input.provider,
  });
  filesGenerated.push(input.template.conventions.contractsPath);

  const routeGroups = groupEndpointsByFile(
    input.template,
    input.specs.appStructure.endpoints,
  );
  for (const [routePath, endpoints] of routeGroups) {
    if (await cancelled()) return { status: "cancelled", filesGenerated };

    await generateFile({
      path: routePath,
      task: routeTask(routePath, endpoints),
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
    filesGenerated.push(routePath);
  }

  return {
    status: "completed",
    filesGenerated,
    contractsPath: input.template.conventions.contractsPath,
  };
}

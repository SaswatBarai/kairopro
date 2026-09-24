import type { RequestContext } from "../../../lib/context";
import { ProviderError } from "../../../lib/errors";
import type { ContainerRuntime } from "../../../platform/container/runtime";
import type { WorkspaceStore } from "../../../platform/workspace/store";
import type { LLMProvider } from "../llm/provider";
import type { DegradationLevel } from "../recovery/degradation";
import type { ConcernCategory } from "../recovery/rules";
import { renderConventions, type TemplateManifest } from "../template";
import type { AppStructureEndpoint } from "../validators/app-structure";
import type { PrdContent } from "../validators/prd";
import { freezeContracts } from "../workflow/steps/freeze-contracts";
import { generateAuthConfig } from "../workflow/steps/generate-auth";
import {
  generateFile,
  type CodeStreamEvent,
} from "../workflow/steps/generate-code";
import type { OnStage } from "./stages";
import { validatePrismaSchema } from "../workflow/steps/generate-data-model";
import {
  renderSpecsForPrompt,
  type ApprovedSpecs,
} from "../workflow/steps/generation-context";

/**
 * Backend phase (Phase 16 / AI-6, repair via Phase 17 / AI-7): schema →
 * migrate → freeze-contracts → API routes — the first half of "Generation
 * order enforced: schema → migrate → API routes → pages → auth
 * configuration". Each stage only starts once the one before it succeeded;
 * a schema failure throws before a single route is generated.
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
  /** Fired once per degradation step across every generated file in this
   * phase — the seam a caller wires to an internal build event. */
  onDegrade?: (
    unit: string,
    step: { level: DegradationLevel; message: string },
  ) => void;
  /** Live view of each generated file as it is written, tagged with its
   * path. The schema is copied from the approved spec, not generated, so it
   * has no stream. */
  onCode?: (unit: string, event: CodeStreamEvent) => void;
  /** Marks the `schema`, `auth` and `api` stages starting and finishing. */
  onStage?: OnStage;
}

export type BackendPhaseResult =
  | {
      status: "completed";
      filesGenerated: string[];
      omitted: string[];
      contractsPath: string;
    }
  | { status: "cancelled"; filesGenerated: string[]; omitted: string[] };

/** Exported for reuse by `phases/test-authoring.ts`, which needs the same
 * endpoint → file mapping to point an integration test at the route it
 * exercises — never re-derived, so the two can't drift apart. */
export function routeFilePath(
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

const MONEY_KEYWORDS = [
  "price",
  "amount",
  "payment",
  "invoice",
  "total",
  "balance",
  "charge",
  "refund",
  "checkout",
  "money",
];

/** What an endpoint is about, for `rules.ts` — never inferred by `rules.ts`
 * itself. A mutating endpoint (not GET) whose path names an entity the
 * PRD's permission matrix governs is tagged `authorization`; one whose
 * path or types mention money vocabulary is tagged `money-handling`;
 * everything else degrades freely. This is a heuristic, not a guarantee —
 * it exists so the common cases (an admin-only mutation, a payment
 * endpoint) default to the safe side, not to catch every case perfectly. */
function concernForEndpoint(
  endpoint: AppStructureEndpoint,
  prd: PrdContent,
): ConcernCategory {
  const isMutating = endpoint.method !== "GET";
  const entityNames = prd.businessRules.permissionMatrix.map((rule) =>
    rule.entity.toLowerCase(),
  );
  const pathSegments = endpoint.path
    .toLowerCase()
    .split(/[/:_-]+/)
    .filter(Boolean);
  // Substring, not exact match: a path segment is very often the entity's
  // plural ("tasks" for "Task"), and this only needs to be right for the
  // common case, not exhaustive.
  const touchesGovernedEntity = pathSegments.some((segment) =>
    entityNames.some(
      (entity) => segment.includes(entity) || entity.includes(segment),
    ),
  );
  if (isMutating && touchesGovernedEntity) return "authorization";

  const haystack =
    `${endpoint.path} ${endpoint.requestType} ${endpoint.responseType}`.toLowerCase();
  if (MONEY_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return "money-handling";
  }

  return "other";
}

/** A route file's concern is the strictest concern among the endpoints it
 * groups — one `generateFile` call, one tag, so it has to cover all of
 * them. */
function concernForRouteGroup(
  endpoints: AppStructureEndpoint[],
  prd: PrdContent,
): ConcernCategory {
  const concerns = endpoints.map((endpoint) =>
    concernForEndpoint(endpoint, prd),
  );
  if (concerns.includes("authorization")) return "authorization";
  if (concerns.includes("money-handling")) return "money-handling";
  return "other";
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
  const omitted: string[] = [];

  const cancelled = async () => {
    if (!input.checkCancelled) return false;
    return input.checkCancelled();
  };

  const stage = input.onStage ?? (() => {});

  if (await cancelled())
    return { status: "cancelled", filesGenerated, omitted };
  stage("schema", "started");
  await writeSchema(input);
  filesGenerated.push(input.template.conventions.prismaSchemaPath);

  if (await cancelled())
    return { status: "cancelled", filesGenerated, omitted };
  await runMigrate(input);
  stage("schema", "completed");

  // Auth before contracts and routes: routes import their session helpers
  // from this module, and a route generated while it is missing can't pass
  // the type check (the fix loop can rewrite a route, not create the module
  // it imports).
  if (await cancelled())
    return { status: "cancelled", filesGenerated, omitted };
  stage("auth", "started");
  const authPath = input.template.conventions.authConfigPath;
  const authResult = await generateAuthConfig({
    projectId: input.projectId,
    buildId: input.buildId,
    ctx: input.ctx,
    workspace: input.workspace,
    runtime: input.runtime,
    containerId: input.containerId,
    cwd: input.cwd,
    template: input.template,
    conventions,
    specs,
    provider: input.provider,
    onDegrade: input.onDegrade
      ? (step) => input.onDegrade!(authPath, step)
      : undefined,
    onCode: input.onCode
      ? (event) => input.onCode!(authPath, event)
      : undefined,
  });
  if (authResult.omitted) omitted.push(authPath);
  else filesGenerated.push(authPath);
  stage("auth", "completed");

  if (await cancelled())
    return { status: "cancelled", filesGenerated, omitted };
  stage("api", "started");
  const contractsResult = await freezeContracts({
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
    onCode: input.onCode
      ? (event) =>
          input.onCode!(input.template.conventions.contractsPath, event)
      : undefined,
  });
  if (contractsResult.omitted) omitted.push(contractsResult.path);
  else filesGenerated.push(contractsResult.path);

  const routeGroups = groupEndpointsByFile(
    input.template,
    input.specs.appStructure.endpoints,
  );
  for (const [routePath, endpoints] of routeGroups) {
    if (await cancelled())
      return { status: "cancelled", filesGenerated, omitted };

    const result = await generateFile({
      path: routePath,
      task: routeTask(routePath, endpoints),
      conventions,
      specs,
      concern: concernForRouteGroup(endpoints, input.specs.prd),
      contextFiles: [
        input.template.conventions.contractsPath,
        input.template.conventions.authConfigPath,
      ],
      projectId: input.projectId,
      buildId: input.buildId,
      ctx: input.ctx,
      workspace: input.workspace,
      runtime: input.runtime,
      containerId: input.containerId,
      cwd: input.cwd,
      provider: input.provider,
      onDegrade: input.onDegrade
        ? (step) => input.onDegrade!(routePath, step)
        : undefined,
      onCode: input.onCode
        ? (event) => input.onCode!(routePath, event)
        : undefined,
    });
    if (result.omitted) omitted.push(routePath);
    else filesGenerated.push(routePath);
  }
  stage("api", "completed");

  return {
    status: "completed",
    filesGenerated,
    omitted,
    contractsPath: input.template.conventions.contractsPath,
  };
}

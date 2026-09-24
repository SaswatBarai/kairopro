import type { RequestContext } from "../../../../lib/context";
import type { ContainerRuntime } from "../../../../platform/container/runtime";
import type { WorkspaceStore } from "../../../../platform/workspace/store";
import type { LLMProvider } from "../../llm/provider";
import type { DegradationLevel } from "../../recovery/degradation";
import type { TemplateManifest } from "../../template";
import {
  generateFile,
  type CodeStreamEvent,
  type GenerateFileResult,
} from "./generate-code";

/**
 * generate-auth workflow step: writes the auth configuration module.
 *
 * It runs *before* the API routes, not after the pages as the original plan
 * had it. Routes import their session/authorization helpers from this
 * module (the conventions tell the model it exists), so a route generated
 * while it is missing fails the type check on the import — and the fix loop
 * can only rewrite the route, never create the module it points at.
 *
 * Tagged `"authorization"`: never degradable. A fix loop that can't get it
 * right halts the build rather than shipping a simplified permission model.
 */

export interface GenerateAuthInput {
  projectId: string;
  buildId?: string;
  ctx: RequestContext;
  workspace: WorkspaceStore;
  runtime: ContainerRuntime;
  containerId: string;
  cwd?: string;
  template: TemplateManifest;
  /** Rendered by `renderConventions`. */
  conventions: string;
  /** Rendered by `renderSpecsForPrompt`. */
  specs: string;
  provider?: LLMProvider;
  onDegrade?: (step: { level: DegradationLevel; message: string }) => void;
  onCode?: (event: CodeStreamEvent) => void;
}

export function authTask(template: TemplateManifest): string {
  return [
    `Configure ${template.conventions.auth} and export it from`,
    `${template.conventions.authConfigPath}. Support the personas and`,
    "permission matrix described in the PRD above — every role listed",
    "there must be representable by the configuration you write. Do not",
    "invent a role or permission the PRD does not describe.",
    "",
    `Use the Prisma client from ${template.conventions.prismaClientPath}`,
    "for any database access; do not construct a PrismaClient here.",
    "",
    "The session and JWT types are already augmented in",
    "src/types/next-auth.d.ts (session.user.id, user.role, token.id,",
    "token.role): use them, do not redeclare them or cast around them.",
    "Hash passwords with `bcryptjs` (installed); never import `bcrypt`.",
    "Use only packages already listed in package.json.",
  ].join("\n");
}

export async function generateAuthConfig(
  input: GenerateAuthInput,
): Promise<GenerateFileResult> {
  return generateFile({
    path: input.template.conventions.authConfigPath,
    task: authTask(input.template),
    conventions: input.conventions,
    specs: input.specs,
    concern: "authorization",
    projectId: input.projectId,
    buildId: input.buildId,
    ctx: input.ctx,
    workspace: input.workspace,
    runtime: input.runtime,
    containerId: input.containerId,
    cwd: input.cwd,
    provider: input.provider,
    onDegrade: input.onDegrade,
    onCode: input.onCode,
  });
}

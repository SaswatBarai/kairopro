import type { RequestContext } from "../../../../lib/context";
import type { ContainerRuntime } from "../../../../platform/container/runtime";
import type { WorkspaceStore } from "../../../../platform/workspace/store";
import type { LLMProvider } from "../../llm/provider";
import { generateFile, type GenerateFileResult } from "./generate-code";

/**
 * freeze-contracts workflow step (Phase 16 / AI-6): writes the single
 * shared types + Zod module every other generated file imports from — the
 * mechanism behind "the backend and frontend phases both consume the
 * frozen contracts and never invent an API shape". Runs once, between the
 * schema/migrate steps and the first generated API route or page, so both
 * `phases/backend.ts` and `phases/frontend.ts` have it available.
 */

export interface FreezeContractsInput {
  projectId: string;
  buildId?: string;
  ctx: RequestContext;
  workspace: WorkspaceStore;
  runtime: ContainerRuntime;
  containerId: string;
  cwd?: string;
  /** Rendered by `renderConventions`. */
  conventions: string;
  /** Rendered by `renderSpecsForPrompt`. */
  specs: string;
  /** `template.json`'s `conventions.contractsPath` — never hardcoded here. */
  contractsPath: string;
  provider?: LLMProvider;
}

/**
 * Tagged `"data-invariants"`, never `"other"`: every generated route and
 * page imports its request/response shape from this one file. A wrong
 * shape here doesn't fail loudly at the point of the mistake — it silently
 * corrupts whatever depends on it, which is exactly what `rules.ts` exists
 * to keep the fix loop from simplifying its way around.
 */
const CONCERN = "data-invariants" as const;

const TASK = [
  "Write a single shared TypeScript module that exports:",
  "",
  "1. A TypeScript type (or interface) for every request/response type",
  "   named in the App Structure spec's endpoints — the exact names given",
  "   there, nothing renamed, nothing added.",
  "2. A Zod schema for each of those types, suitable for validating a",
  "   request body or response payload at runtime. Name each schema",
  "   `<TypeName>Schema`.",
  "",
  "This module is the ONLY source of these types for the rest of the",
  "project: every API route and every frontend component that needs one of",
  "these types imports it from here, never redefines it locally. Do not",
  "invent a request/response type the App Structure spec does not name,",
  "and do not omit one that it does.",
].join("\n");

export async function freezeContracts(
  input: FreezeContractsInput,
): Promise<GenerateFileResult> {
  return generateFile({
    path: input.contractsPath,
    task: TASK,
    conventions: input.conventions,
    specs: input.specs,
    concern: CONCERN,
    projectId: input.projectId,
    buildId: input.buildId,
    ctx: input.ctx,
    workspace: input.workspace,
    runtime: input.runtime,
    containerId: input.containerId,
    cwd: input.cwd,
    provider: input.provider,
  });
}

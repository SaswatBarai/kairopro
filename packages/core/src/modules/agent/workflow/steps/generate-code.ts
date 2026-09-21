import type { RequestContext } from "../../../../lib/context";
import { ProviderError } from "../../../../lib/errors";
import type { ContainerRuntime } from "../../../../platform/container/runtime";
import type { WorkspaceStore } from "../../../../platform/workspace/store";
import { getLLMProvider } from "../../llm";
import type { LLMProvider } from "../../llm/provider";
import { modelFor } from "../../llm/router";
import { completeWithValidator } from "../../llm/structured";
import { renderPrompt } from "../../prompts/loader";
import { retrieve } from "../../context/retrieve";
import { runTypecheck, type TypecheckError } from "../../validators/typecheck";

/**
 * generate-code engine (Phase 16 / AI-6): generates one file, type-checks
 * the project, and — if that fails — fixes it, before ever returning.
 * "Each file is generated, type-checked, and fixed before the next file is
 * generated" is enforced by this being the *only* way a caller writes a
 * generated file; `phases/backend.ts` and `phases/frontend.ts` just call
 * this once per file, in order.
 *
 * File-by-file, not all-at-once: generating thirty files and then fixing
 * compounding errors costs far more in tokens and reliability than
 * localizing each failure to the one file that caused it.
 */

const DEFAULT_MAX_FIX_ATTEMPTS = 2;

/** Exhausted its fix attempts without the project type-checking clean. */
export class CodeGenerationError extends ProviderError {
  readonly path: string;
  readonly typecheckErrors: TypecheckError[];

  constructor(opts: {
    path: string;
    typecheckErrors: TypecheckError[];
    message: string;
  }) {
    super({
      message: opts.message,
      details: { path: opts.path, typecheckErrors: opts.typecheckErrors },
    });
    this.path = opts.path;
    this.typecheckErrors = opts.typecheckErrors;
  }
}

export interface GenerateFileInput {
  /** Workspace-relative path of the file to write. */
  path: string;
  /** What this file must do — the `{{task}}` the code-gen prompt fills. */
  task: string;
  /** Rendered by `renderConventions` — never prompt-text conventions. */
  conventions: string;
  /** Rendered by `renderSpecsForPrompt`. */
  specs: string;
  projectId: string;
  buildId?: string;
  ctx: RequestContext;
  workspace: WorkspaceStore;
  runtime: ContainerRuntime;
  containerId: string;
  /** Container-side working directory `tsc` runs from — the generated
   * project's root. */
  cwd?: string;
  provider?: LLMProvider;
  maxFixAttempts?: number;
}

export interface GenerateFileResult {
  path: string;
  /** 0 means the first generation already type-checked clean. */
  fixAttempts: number;
}

function stripFences(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  return (fenced ? fenced[1] : trimmed) ?? trimmed;
}

function validateNonEmpty(content: string): string {
  const stripped = stripFences(content);
  if (stripped.trim().length === 0) {
    throw new Error("Generated file content must not be empty");
  }
  return stripped;
}

function formatTypecheckErrors(errors: TypecheckError[]): string {
  return errors
    .map((e) => `${e.file}(${e.line},${e.column}): ${e.code}: ${e.message}`)
    .join("\n");
}

/**
 * Generates one file against the frozen specs and template conventions,
 * writes it, and type-checks the whole project. A failure is fixed
 * in place (same file, same path) using real `tsc` output as ground
 * truth — up to `maxFixAttempts` times — before throwing
 * `CodeGenerationError`.
 */
export async function generateFile(
  input: GenerateFileInput,
): Promise<GenerateFileResult> {
  const provider = input.provider ?? getLLMProvider();
  const maxFixAttempts = input.maxFixAttempts ?? DEFAULT_MAX_FIX_ATTEMPTS;
  const refs = { projectId: input.projectId, buildId: input.buildId };

  const raw = await completeWithValidator({
    provider,
    model: modelFor("code-gen"),
    messages: [
      { role: "system", content: renderPrompt("system") },
      {
        role: "user",
        content: renderPrompt("code-gen", {
          conventions: input.conventions,
          specs: input.specs,
          task: input.task,
        }),
      },
    ],
    ctx: input.ctx,
    refs,
    validate: (content) => validateNonEmpty(content),
  });

  await input.workspace.writeFile(input.projectId, input.path, raw);

  let errors = await runTypecheck({
    runtime: input.runtime,
    containerId: input.containerId,
    cwd: input.cwd,
  });

  let attempts = 0;
  while (errors.length > 0 && attempts < maxFixAttempts) {
    attempts += 1;

    const retrieved = await retrieve(
      { query: input.task, seedFiles: [input.path] },
      { id: input.projectId, workspace: input.workspace },
      "fix",
    );
    const context = [
      retrieved.summary,
      ...retrieved.files.map((f) => `--- ${f.path} ---\n${f.contents}`),
    ].join("\n\n");

    const fixed = await completeWithValidator({
      provider,
      model: modelFor("fix"),
      messages: [
        { role: "system", content: renderPrompt("system") },
        {
          role: "user",
          content: renderPrompt("fix", {
            conventions: input.conventions,
            error: formatTypecheckErrors(errors),
            context,
          }),
        },
      ],
      ctx: input.ctx,
      refs,
      validate: (content) => validateNonEmpty(content),
    });

    await input.workspace.writeFile(input.projectId, input.path, fixed);

    errors = await runTypecheck({
      runtime: input.runtime,
      containerId: input.containerId,
      cwd: input.cwd,
    });
  }

  if (errors.length > 0) {
    throw new CodeGenerationError({
      path: input.path,
      typecheckErrors: errors,
      message: `${input.path} still fails to type-check after ${maxFixAttempts} fix attempt(s)`,
    });
  }

  return { path: input.path, fixAttempts: attempts };
}

import { isReusableFile } from "../resume";
import type { RequestContext } from "../../../../lib/context";
import { ProviderError } from "../../../../lib/errors";
import type { ContainerRuntime } from "../../../../platform/container/runtime";
import type { WorkspaceStore } from "../../../../platform/workspace/store";
import { retrieve } from "../../context/retrieve";
import { getLLMProvider } from "../../llm";
import type { LLMProvider } from "../../llm/provider";
import { modelFor } from "../../llm/router";
import { completeWithValidator } from "../../llm/structured";
import { renderPrompt } from "../../prompts/loader";
import type { DegradationLevel } from "../../recovery/degradation";
import { runFixLoop, type AttemptOutcome } from "../../recovery/fix-loop";
import type { ConcernCategory } from "../../recovery/rules";
import { runTypecheck, type TypecheckError } from "../../validators/typecheck";

/**
 * generate-code engine (Phase 16 / AI-6, repair driven by Phase 17 / AI-7):
 * generates one file, type-checks the project, and — if that fails —
 * repairs it via `recovery/fix-loop.ts` before ever returning. "Each file
 * is generated, type-checked, and fixed before the next file is generated"
 * is enforced by this being the *only* way a caller writes a generated
 * file; `phases/backend.ts` and `phases/frontend.ts` just call this once
 * per file, in order, each tagged with the concern `rules.ts` needs to
 * decide whether an unrecoverable failure may be simplified or must halt.
 *
 * File-by-file, not all-at-once: generating thirty files and then fixing
 * compounding errors costs far more in tokens and reliability than
 * localizing each failure to the one file that caused it.
 */

/** The fix loop could not produce a working file — either it hit an
 * unrecognized failure shape, a never-degradable concern ran out of
 * approaches, or the whole attempt budget was exhausted. Every case is
 * already recorded as an `InternalError` by `fix-loop.ts`'s own logging;
 * this is just what propagates to the caller so the build fails loudly
 * instead of silently continuing on missing code. */
export class CodeGenerationError extends ProviderError {
  readonly path: string;
  readonly reason: "unrecognized-failure" | "never-degradable" | "exhausted";

  constructor(opts: {
    path: string;
    reason: "unrecognized-failure" | "never-degradable" | "exhausted";
    message: string;
  }) {
    super({
      message: opts.message,
      details: { path: opts.path, reason: opts.reason },
    });
    this.path = opts.path;
    this.reason = opts.reason;
  }
}

/** What a caller watching a file being written sees, in order: `reset`
 * before every generation attempt (the first, and each repair — discard
 * whatever was shown), `delta` text as the model produces it, and one
 * `done` when the file is final. `omitted` means the unit was skipped and
 * no file exists. Deltas are the model's raw text: it may include a
 * wrapping code fence, which the final written file does not. */
export type CodeStreamEvent =
  | { type: "reset" }
  | { type: "delta"; text: string }
  | { type: "done"; omitted: boolean; content?: string };

export interface GenerateFileInput {
  /** Workspace-relative path of the file to write. */
  path: string;
  /** What this file must do — the `{{task}}` the code-gen prompt fills. */
  task: string;
  /** Rendered by `renderConventions` — never prompt-text conventions. */
  conventions: string;
  /** Rendered by `renderSpecsForPrompt`. */
  specs: string;
  /** What this file is about — `rules.ts` decides degradability from
   * this and only this; the caller tags it, this never infers it. */
  concern: ConcernCategory;
  projectId: string;
  buildId?: string | null;
  ctx: RequestContext;
  workspace: WorkspaceStore;
  runtime: ContainerRuntime;
  containerId: string;
  /** Container-side working directory `tsc` runs from — the generated
   * project's root. */
  cwd?: string;
  /** Workspace files (e.g. the contracts module) the file must agree with.
   * Their current contents go into every attempt's prompt — without them
   * the model guesses shapes (`null` vs `undefined`) and fails the type
   * check on them. Missing files are skipped. */
  contextFiles?: string[];
  provider?: LLMProvider;
  maxFixAttempts?: number;
  maxDistinctApproaches?: number;
  /** Fired once per degradation step — the seam a caller wires to an
   * internal build event. */
  onDegrade?: (step: { level: DegradationLevel; message: string }) => void;
  /** Live view of the file being written — see `CodeStreamEvent`. */
  onCode?: (event: CodeStreamEvent) => void;
}

export interface GenerateFileResult {
  path: string;
  /** Total attempts the fix loop made, including the first. */
  fixAttempts: number;
  /** `"full"` unless the unit was degraded to reach a working state. */
  level: DegradationLevel;
  /** True when the unit was skipped entirely — no file was written. */
  omitted: boolean;
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
 * writes it, and type-checks the whole project. A failure is repaired in
 * place (same path) by `runFixLoop`, using real `tsc` output as ground
 * truth for each retry — `throw`s `CodeGenerationError` only if the fix
 * loop itself halts (never-degradable, unrecognized, or exhausted).
 */
export async function generateFile(
  input: GenerateFileInput,
): Promise<GenerateFileResult> {
  if (isReusableFile(input.path)) {
    const existing = await input.workspace
      .readFile(input.projectId, input.path)
      .catch(() => null);
    if (existing !== null) {
      input.onCode?.({ type: "done", omitted: false, content: existing });
      return {
        path: input.path,
        fixAttempts: 0,
        level: "full",
        omitted: false,
      };
    }
  }

  const provider = input.provider ?? getLLMProvider();
  const refs = { projectId: input.projectId, buildId: input.buildId };
  // What the last attempt actually saved — the file as it is on disk.
  let lastWritten = "";
  const stream = input.onCode
    ? {
        onAttemptStart: () => input.onCode!({ type: "reset" }),
        onDelta: (text: string) => input.onCode!({ type: "delta", text }),
      }
    : undefined;

  async function attempt(step: {
    task: string;
    previousFailure?: string;
  }): Promise<AttemptOutcome<true>> {
    const pinned: string[] = [];
    for (const file of input.contextFiles ?? []) {
      try {
        const text = await input.workspace.readFile(input.projectId, file);
        pinned.push(`--- ${file} ---\n${text}`);
      } catch {
        // not written yet
      }
    }
    const pinnedBlock = pinned.length
      ? `\n\n# Existing files this must match exactly\n\n${pinned.join("\n\n")}`
      : "";

    let raw: string;
    if (step.previousFailure === undefined) {
      raw = await completeWithValidator({
        provider,
        model: modelFor("code-gen"),
        messages: [
          { role: "system", content: renderPrompt("system") },
          {
            role: "user",
            content: renderPrompt("code-gen", {
              conventions: input.conventions,
              specs: input.specs,
              task: step.task + pinnedBlock,
            }),
          },
        ],
        ctx: input.ctx,
        refs,
        validate: validateNonEmpty,
        stream,
      });
    } else {
      const retrieved = await retrieve(
        { query: step.task, seedFiles: [input.path] },
        { id: input.projectId, workspace: input.workspace },
        "fix",
      );
      const context = [
        retrieved.summary,
        ...pinned,
        ...retrieved.files.map((f) => `--- ${f.path} ---\n${f.contents}`),
      ].join("\n\n");

      raw = await completeWithValidator({
        provider,
        model: modelFor("fix"),
        messages: [
          { role: "system", content: renderPrompt("system") },
          {
            role: "user",
            content: renderPrompt("fix", {
              path: input.path,
              conventions: input.conventions,
              error: step.previousFailure,
              context,
            }),
          },
        ],
        ctx: input.ctx,
        refs,
        validate: validateNonEmpty,
        stream,
      });
    }

    await input.workspace.writeFile(input.projectId, input.path, raw);
    lastWritten = raw;

    const errors = await runTypecheck({
      runtime: input.runtime,
      containerId: input.containerId,
      cwd: input.cwd,
    });
    if (errors.length === 0) return { ok: true, value: true };
    return {
      ok: false,
      failure: {
        signal: { source: "typecheck", message: formatTypecheckErrors(errors) },
      },
    };
  }

  const result = await runFixLoop<true>({
    unitName: input.path,
    concern: input.concern,
    originalTask: input.task,
    buildId: input.buildId,
    maxAttemptsPerError: input.maxFixAttempts,
    maxDistinctApproaches: input.maxDistinctApproaches,
    attempt,
    onDegrade: input.onDegrade,
  });

  if (result.status === "succeeded") {
    input.onCode?.({ type: "done", omitted: false, content: lastWritten });
    return {
      path: input.path,
      fixAttempts: result.attempts,
      level: result.level,
      omitted: false,
    };
  }
  if (result.status === "omitted") {
    input.onCode?.({ type: "done", omitted: true });
    return {
      path: input.path,
      fixAttempts: result.attempts,
      level: "omit",
      omitted: true,
    };
  }

  throw new CodeGenerationError({
    path: input.path,
    reason: result.reason,
    message: `${input.path} could not be generated (${result.reason})`,
  });
}

import { ValidationError } from "../../../lib/errors";
import type { WorkspaceStore } from "../../../platform/workspace/store";

/**
 * Shared safety primitives for every tool (Phase 9 / AI-2): path
 * confinement, a destructive-command denylist, output truncation, and the
 * default command timeout.
 */

/**
 * Confines a tool-supplied relative path to the project's workspace.
 * Delegates to `WorkspaceStore.resolve` — the one implementation of the
 * traversal / absolute-path / symlink-escape check (Phase 2) — rather than
 * re-deriving it here. Tools that don't already go through a store method
 * that confines internally (`search.tools`, `exec.tools`'s cwd) call this
 * directly; tools that call `readFile`/`writeFile`/`listFiles`/`deleteEntry`
 * get the same guarantee from the store itself.
 */
export async function confinePath(
  store: WorkspaceStore,
  projectId: string,
  relativePath: string,
): Promise<string> {
  return store.resolve(projectId, relativePath);
}

/** Command patterns that are never allowed, even inside a container: things
 * that are catastrophic and irreversible regardless of isolation (and, for
 * `StubContainerRuntime`, run directly on the host with no isolation at
 * all). Not a substitute for real container isolation — a second layer. */
const RM_RF_FLAGS = /-[a-z]*[rf][a-z]*[rf][a-z]*\b|--recursive|--force/;
const DENYLIST_PATTERNS: RegExp[] = [
  new RegExp(
    `\\brm\\s+((?:${RM_RF_FLAGS.source})\\s+)+(\\/|~|\\*)(\\s|$)`,
    "i",
  ), // rm -rf /, ~, *
  /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, // fork bomb
  /\bmkfs(\.\w+)?\b/,
  /\bdd\s+[^\n]*\bof=\/dev\/\w+/,
  /\bchmod\s+-R\s+777\s+\/(?:\s|$)/,
  /\bchown\s+-R\s+\S+\s+\/(?:\s|$)/,
  />\s*\/dev\/sd[a-z]\d*\b/,
  /\b(shutdown|reboot|poweroff|halt)\b/,
];

/** Throws `ValidationError` when `cmd` matches a denylisted destructive
 * pattern. Never mutates or normalizes the command — a rejection is a
 * rejection. */
export function assertCommandAllowed(cmd: string): void {
  for (const pattern of DENYLIST_PATTERNS) {
    if (pattern.test(cmd)) {
      throw new ValidationError({
        message: "Command matches a denylisted destructive pattern",
        details: { cmd },
      });
    }
  }
}

export const DEFAULT_COMMAND_TIMEOUT_MS = 30_000;
export const MAX_COMMAND_TIMEOUT_MS = 5 * 60_000;

/** Output above this size is truncated head-and-tail, so one runaway
 * command or a giant file read cannot blow up the agent's context. */
const MAX_OUTPUT_BYTES = 200_000;
const HEAD_BYTES = 80_000;
const TAIL_BYTES = 80_000;

export interface TruncatedOutput {
  content: string;
  truncated: boolean;
}

/** Truncates `output` head-and-tail above `MAX_OUTPUT_BYTES`, noting how
 * much was cut. Below the threshold, `output` passes through unchanged. */
export function truncateOutput(output: string): TruncatedOutput {
  const size = Buffer.byteLength(output, "utf8");
  if (size <= MAX_OUTPUT_BYTES) {
    return { content: output, truncated: false };
  }

  const head = output.slice(0, HEAD_BYTES);
  const tail = output.slice(-TAIL_BYTES);
  const omittedBytes =
    size - Buffer.byteLength(head, "utf8") - Buffer.byteLength(tail, "utf8");
  return {
    content: `${head}\n\n… [truncated ${omittedBytes} bytes] …\n\n${tail}`,
    truncated: true,
  };
}

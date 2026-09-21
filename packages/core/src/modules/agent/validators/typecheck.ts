import type { ContainerRuntime } from "../../../platform/container/runtime";

/**
 * Type-check validation (Phase 16 / AI-6) — runs `tsc --noEmit` inside the
 * project's container and parses its output into structured records. This
 * is what gates every generated file: nothing is considered "done" on
 * schema validity alone, only on actually compiling.
 */

export interface TypecheckError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}

// `tsc --pretty false`'s diagnostic line: `file(line,col): error TSxxxx: message`.
// A diagnostic's message can continue onto following, indented lines (e.g.
// "The types of 'x' are incompatible...") — those don't match this pattern
// and are folded into the diagnostic they follow, not treated as new ones.
const DIAGNOSTIC_RE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;

/** Parses real `tsc --noEmit --pretty false` output. Pure — no I/O, so it's
 * testable against captured/real compiler output directly. */
export function parseTscOutput(output: string): TypecheckError[] {
  const errors: TypecheckError[] = [];
  let current: TypecheckError | undefined;

  for (const rawLine of output.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.trim().length === 0) continue;

    const match = line.match(DIAGNOSTIC_RE);
    if (match) {
      const [, file, lineStr, columnStr, code, message] = match;
      current = {
        file: file!,
        line: Number(lineStr),
        column: Number(columnStr),
        code: code!,
        message: message!,
      };
      errors.push(current);
    } else if (current) {
      current.message += `\n${line.trim()}`;
    }
    // A line before any diagnostic has started (e.g. a summary banner) is
    // neither a new diagnostic nor a continuation of one — dropped.
  }

  return errors;
}

export interface RunTypecheckInput {
  runtime: ContainerRuntime;
  containerId: string;
  /** Working directory inside the container — the generated project's root. */
  cwd?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/** Runs `tsc --noEmit` inside the container and returns its parsed errors —
 * an empty array means the project type-checks cleanly. Never throws on a
 * non-zero exit: a failing type-check is exactly the signal this exists to
 * report, not an exec failure. */
export async function runTypecheck(
  input: RunTypecheckInput,
): Promise<TypecheckError[]> {
  const result = await input.runtime.exec({
    containerId: input.containerId,
    cmd: "npx tsc --noEmit --pretty false",
    cwd: input.cwd,
    timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
  return parseTscOutput(result.stdout);
}

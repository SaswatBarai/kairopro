import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ValidationError } from "../../../lib/errors";
import type { WorkflowPhase } from "../llm/router";

/**
 * Prompt loader (Phase 8 / AI-3). Prompts are markdown files on disk, never
 * string literals in TypeScript — that is what keeps them diffable in
 * review and lets the convention-leak test scan them as plain text.
 */

export type PromptName = WorkflowPhase | "system";

const PROMPTS_DIR = path.dirname(fileURLToPath(import.meta.url));

const cache = new Map<PromptName, string>();

/** Loads and caches a prompt's raw markdown source — the file is read from
 * disk at most once per process. */
export function loadPrompt(name: PromptName): string {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;

  const filePath = path.join(PROMPTS_DIR, `${name}.md`);
  let source: string;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (cause) {
    throw new ValidationError({
      message: `Prompt "${name}" not found at ${filePath}`,
      cause,
    });
  }

  cache.set(name, source);
  return source;
}

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * Renders a prompt's `{{name}}` placeholders against `variables`.
 * Interpolation is explicit: every placeholder the template actually uses
 * must have a corresponding key in `variables`, or this throws naming the
 * missing variable — it never silently renders the literal `undefined`.
 */
export function renderPrompt(
  name: PromptName,
  variables: Record<string, string> = {},
): string {
  const source = loadPrompt(name);
  return source.replace(PLACEHOLDER_RE, (_match, key: string) => {
    const value = variables[key];
    if (value === undefined) {
      throw new ValidationError({
        message: `Prompt "${name}" is missing required variable "${key}"`,
        details: { prompt: name, variable: key },
      });
    }
    return value;
  });
}

/** Test seam: clears the in-memory cache so tests can assert cold-load
 * behavior or reload a file that changed on disk. */
export function clearPromptCache(): void {
  cache.clear();
}

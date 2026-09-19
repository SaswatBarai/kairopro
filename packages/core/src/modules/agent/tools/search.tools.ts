import { z } from "zod";
import type { ToolContext } from "./context";
import type { Tool, ToolResult } from "./registry";
import { confinePath, truncateOutput } from "./safety";

/**
 * Search tools (Phase 9 / AI-2): literal string search and naive symbol
 * lookup over a project's workspace. Deliberately simple — static text
 * search, not semantic analysis. The context builder's `retrieve()`
 * (Phase 10) is where indexing gets real; these are what an agent reaches
 * for mid-task.
 */

const DEFAULT_IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  "build",
  "coverage",
]);

function isIgnored(relativePath: string): boolean {
  return relativePath
    .split("/")
    .some((segment) => DEFAULT_IGNORE_DIRS.has(segment));
}

function toResult(output: string): ToolResult {
  const { content, truncated } = truncateOutput(output);
  return { output: content, truncated };
}

const MAX_RESULTS_CAP = 500;
const DEFAULT_MAX_RESULTS = 100;

const SearchCodeInput = z.object({
  query: z.string().min(1),
  path: z.string().min(1).optional(),
  maxResults: z.number().int().positive().max(MAX_RESULTS_CAP).optional(),
});

export const searchCodeTool: Tool<z.infer<typeof SearchCodeInput>> = {
  name: "search_code",
  description:
    "Search file contents in the project workspace for a literal string.",
  inputSchema: SearchCodeInput,
  async run(input, context) {
    const root = input.path ?? ".";
    await confinePath(context.workspace, context.projectId, root);

    const files = await context.workspace.listFiles(context.projectId, root);
    const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;
    const matches: string[] = [];

    outer: for (const file of files) {
      if (isIgnored(file)) continue;
      const lines = await readLines(context, file);
      if (!lines) continue;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.includes(input.query)) {
          matches.push(`${file}:${i + 1}: ${lines[i]!.trim()}`);
          if (matches.length >= maxResults) break outer;
        }
      }
    }

    return toResult(matches.length ? matches.join("\n") : "No matches found.");
  },
};

const FindSymbolInput = z.object({
  symbol: z.string().min(1),
  path: z.string().min(1).optional(),
});

const DECLARATION_KEYWORDS = "function|class|interface|type|const|let|var|enum";

export const findSymbolTool: Tool<z.infer<typeof FindSymbolInput>> = {
  name: "find_symbol",
  description:
    "Find where a symbol (function, class, type, const, ...) is declared in the workspace.",
  inputSchema: FindSymbolInput,
  async run(input, context) {
    const root = input.path ?? ".";
    await confinePath(context.workspace, context.projectId, root);

    const pattern = new RegExp(
      `\\b(${DECLARATION_KEYWORDS})\\s+${escapeRegExp(input.symbol)}\\b`,
    );
    const files = await context.workspace.listFiles(context.projectId, root);
    const matches: string[] = [];

    for (const file of files) {
      if (isIgnored(file)) continue;
      const lines = await readLines(context, file);
      if (!lines) continue;
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i]!)) {
          matches.push(`${file}:${i + 1}: ${lines[i]!.trim()}`);
        }
      }
    }

    return toResult(
      matches.length
        ? matches.join("\n")
        : `No declaration found for "${input.symbol}".`,
    );
  },
};

async function readLines(
  context: ToolContext,
  file: string,
): Promise<string[] | null> {
  try {
    const contents = await context.workspace.readFile(context.projectId, file);
    return contents.split("\n");
  } catch {
    // Unreadable or binary — skip rather than fail the whole search.
    return null;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

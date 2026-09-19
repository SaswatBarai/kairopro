import path from "node:path";
import type { FileIndex } from "./file-index";

/**
 * Dependency graph (Phase 10 / AI-4): reverse imports over the file index.
 * This is what expands "the schema changed" into "and so did the routes
 * and forms that import it" — a request naming one file pulls in everyone
 * who depends on it, not just the file itself.
 *
 * Only relative specifiers (`./x`, `../x`) are resolved to workspace paths.
 * A bare specifier (`react`, `@/lib/x`) isn't part of the workspace, so
 * there's nothing to resolve it against without alias configuration
 * (`template.json`, Phase 16) — it's left unresolved rather than guessed.
 */

export interface DependencyGraph {
  /** Workspace paths that import `filePath`, sorted. */
  dependents(filePath: string): string[];
}

export function buildDependencyGraph(index: FileIndex): DependencyGraph {
  const known = new Set(index.map((entry) => entry.path));
  const reverse = new Map<string, Set<string>>();

  for (const entry of index) {
    for (const specifier of entry.imports) {
      const resolved = resolveRelativeImport(entry.path, specifier, known);
      if (!resolved) continue;
      let dependents = reverse.get(resolved);
      if (!dependents) {
        dependents = new Set();
        reverse.set(resolved, dependents);
      }
      dependents.add(entry.path);
    }
  }

  return {
    dependents(filePath: string): string[] {
      return [...(reverse.get(filePath) ?? [])].sort();
    },
  };
}

const CANDIDATE_SUFFIXES = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  "/index.ts",
  "/index.tsx",
];

function resolveRelativeImport(
  fromPath: string,
  specifier: string,
  known: Set<string>,
): string | undefined {
  if (!specifier.startsWith(".")) return undefined;

  const fromDir = path.posix.dirname(fromPath);
  const base = path.posix.normalize(path.posix.join(fromDir, specifier));

  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = `${base}${suffix}`;
    if (known.has(candidate)) return candidate;
  }
  return undefined;
}

import type { WorkspaceStore } from "../../../platform/workspace/store";

/**
 * File index (Phase 10 / AI-4): cheap, static-analysis-derived metadata per
 * file — never a model call. "The file index is generated on build" means
 * this reads every file once and keeps only the derived facts below, not
 * the file's contents — that's what makes stage-1 retrieval cheap. The
 * actual contents are re-read later, only for the finally-selected files
 * (`hydrate.ts`).
 */

export interface FileIndexEntry {
  path: string;
  /** First-line leading comment, if any — a human-readable hint at what the
   * file is for. Never model-generated. */
  purpose?: string;
  exports: string[];
  /** Raw import specifiers as written (e.g. `"../models/user"`, `"react"`).
   * Resolving them to workspace paths is `dependency-graph.ts`'s job. */
  imports: string[];
  tags: string[];
}

export type FileIndex = FileIndexEntry[];

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  "build",
  "coverage",
]);
const INDEXABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".prisma",
  ".md",
]);

function isIgnored(path: string): boolean {
  return path.split("/").some((segment) => IGNORE_DIRS.has(segment));
}

function isIndexable(path: string): boolean {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return false;
  return INDEXABLE_EXTENSIONS.has(path.slice(dot));
}

export async function buildFileIndex(
  workspace: WorkspaceStore,
  projectId: string,
): Promise<FileIndex> {
  const files = await workspace.listFiles(projectId);
  const entries: FileIndex = [];

  for (const path of files) {
    if (isIgnored(path) || !isIndexable(path)) continue;
    let contents: string;
    try {
      contents = await workspace.readFile(projectId, path);
    } catch {
      continue; // vanished or unreadable between listing and reading — skip
    }
    entries.push(indexFile(path, contents));
  }

  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

function indexFile(path: string, contents: string): FileIndexEntry {
  return {
    path,
    purpose: extractPurpose(contents),
    exports: extractExports(contents),
    imports: extractImports(contents),
    tags: tagFile(path),
  };
}

const IMPORT_FROM_RE = /\bfrom\s+["']([^"']+)["']/g;
const BARE_IMPORT_RE = /^\s*import\s+["']([^"']+)["']/gm;
const DYNAMIC_IMPORT_RE = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
const REQUIRE_RE = /\brequire\(\s*["']([^"']+)["']\s*\)/g;

function extractImports(contents: string): string[] {
  const specifiers = new Set<string>();
  for (const re of [
    IMPORT_FROM_RE,
    BARE_IMPORT_RE,
    DYNAMIC_IMPORT_RE,
    REQUIRE_RE,
  ]) {
    for (const match of contents.matchAll(re)) {
      const specifier = match[1];
      if (specifier) specifiers.add(specifier);
    }
  }
  return [...specifiers].sort();
}

const EXPORT_DECL_RE =
  /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|var|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
const EXPORT_LIST_RE = /\bexport\s*\{([^}]+)\}/g;

function extractExports(contents: string): string[] {
  const names = new Set<string>();
  for (const match of contents.matchAll(EXPORT_DECL_RE)) {
    const name = match[1];
    if (name) names.add(name);
  }
  for (const match of contents.matchAll(EXPORT_LIST_RE)) {
    const list = match[1];
    if (!list) continue;
    for (const item of list.split(",")) {
      // `foo as bar` exports under `bar`; a bare `default` isn't a name.
      const parts = item.trim().split(/\s+as\s+/);
      const name = (parts[1] ?? parts[0])?.trim();
      if (name && name !== "default") names.add(name);
    }
  }
  return [...names].sort();
}

function extractPurpose(contents: string): string | undefined {
  const lines = contents.split("\n");
  const firstNonEmpty = lines.find((l) => l.trim().length > 0);
  if (!firstNonEmpty) return undefined;
  const trimmed = firstNonEmpty.trim();

  if (trimmed.startsWith("/*")) {
    const collected: string[] = [];
    for (const line of lines) {
      collected.push(
        line
          .trim()
          .replace(/^\/\*\*?|\*\/$|^\*/g, "")
          .trim(),
      );
      if (line.includes("*/")) break;
    }
    const text = collected.filter(Boolean).join(" ");
    return text || undefined;
  }

  if (trimmed.startsWith("//")) {
    const collected: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("//")) break;
      collected.push(t.replace(/^\/\/\s?/, ""));
    }
    const text = collected.join(" ");
    return text || undefined;
  }

  return undefined;
}

function tagFile(path: string): string[] {
  const tags: string[] = [];
  if (path.endsWith(".prisma") || /\/models\//.test(path)) tags.push("schema");
  if (/\/(api|routes)\//.test(path)) tags.push("route");
  if (/\/(pages|app)\//.test(path) && /page\.[jt]sx?$/.test(path))
    tags.push("page");
  if (/\/components\//.test(path)) tags.push("component");
  if (/\.test\.[jt]sx?$/.test(path)) tags.push("test");
  if (tags.length === 0) tags.push("file");
  return tags;
}

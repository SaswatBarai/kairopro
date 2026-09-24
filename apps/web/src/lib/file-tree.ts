export interface TreeNode {
  name: string;
  path: string;
  kind: "folder" | "file";
  children?: TreeNode[];
}

const byFoldersThenName = (a: TreeNode, b: TreeNode) =>
  a.kind === b.kind
    ? a.name.localeCompare(b.name)
    : a.kind === "folder"
      ? -1
      : 1;

/** Nests flat, slash-separated file paths into folders. Folders sort before
 * files, each group alphabetically, at every level. */
export function buildFileTree(paths: readonly string[]): TreeNode[] {
  const roots: TreeNode[] = [];

  for (const filePath of paths) {
    const parts = filePath.split("/").filter(Boolean);
    let level = roots;
    parts.forEach((name, index) => {
      const path = parts.slice(0, index + 1).join("/");
      const isFile = index === parts.length - 1;
      let node = level.find((n) => n.path === path);
      if (!node) {
        node = isFile
          ? { name, path, kind: "file" }
          : { name, path, kind: "folder", children: [] };
        level.push(node);
      }
      if (!isFile) level = node.children!;
    });
  }

  const sort = (nodes: TreeNode[]) => {
    nodes.sort(byFoldersThenName);
    for (const node of nodes) if (node.children) sort(node.children);
  };
  sort(roots);
  return roots;
}

/** Every folder that contains something, shallowest first — for expanding a
 * tree up to a depth. */
export function folderPaths(paths: readonly string[], maxDepth: number) {
  const folders = new Set<string>();
  for (const filePath of paths) {
    const parts = filePath.split("/");
    for (let i = 1; i < parts.length && i <= maxDepth; i++) {
      folders.add(parts.slice(0, i).join("/"));
    }
  }
  return [...folders].sort();
}

export function basename(path: string) {
  return path.split("/").pop() ?? path;
}

export function dirname(path: string) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

/** The colour of a file's dot in the tree and tabs, by what it is. */
export function fileTone(path: string) {
  if (/(^|\/)__tests__\/|\.(test|spec)\.[jt]sx?$/.test(path))
    return "bg-brand-green";
  if (path.includes("/api/") || path.startsWith("src/lib/"))
    return "bg-brand-cyan";
  if (path.endsWith(".tsx")) return "bg-brand-purple-light";
  if (path.endsWith(".prisma")) return "bg-amber-400";
  return "bg-zinc-500";
}

/** A short tag beside files that are worth calling out. */
export function fileBadge(path: string): string | null {
  if (/^src\/app\/api\/.*\/route\.[jt]sx?$/.test(path)) return "API";
  if (path.endsWith(".prisma")) return "DB";
  return null;
}

export function languageOf(path: string): string {
  const ext = /\.([^./]+)$/.exec(path)?.[1]?.toLowerCase();
  switch (ext) {
    case "ts":
    case "mts":
      return "TypeScript";
    case "tsx":
      return "TypeScript React";
    case "js":
    case "mjs":
    case "cjs":
      return "JavaScript";
    case "jsx":
      return "JavaScript React";
    case "json":
      return "JSON";
    case "prisma":
      return "Prisma";
    case "md":
      return "Markdown";
    case "css":
      return "CSS";
    default:
      return "Plain text";
  }
}

const OPEN_FIRST = [
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "prisma/schema.prisma",
  "package.json",
];

/** The file to show when a project is opened with nothing chosen. */
export function defaultFileToOpen(paths: readonly string[]): string | null {
  for (const preferred of OPEN_FIRST) {
    if (paths.includes(preferred)) return preferred;
  }
  return paths[0] ?? null;
}

import { promises as fs } from "node:fs";
import type { ProjectFileContent } from "@kairopro/contracts";
import type { RequestContext } from "../../lib/context";
import { NotFoundError } from "../../lib/errors";
import { getWorkspaceStore } from "../../platform/workspace";
import { ownerOf } from "../org/access";

/**
 * Read-only access to a project's generated files, for the workspace's file
 * tree and code viewer. Everything goes through the workspace store, which
 * confines paths to the project's own directory.
 */

/** Dependency and build-output folders: thousands of files nobody browses
 * here, and after an install they would bury the project's own code. */
const SKIP_DIRS = [
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "dist",
  "coverage",
];

/** Above this a file is reported, not sent — a generated lockfile or a
 * bundled asset isn't something to read in a code viewer. */
export const MAX_FILE_BYTES = 512 * 1024;

async function requireProjectAccess(projectId: string, ctx: RequestContext) {
  const project = await ownerOf(projectId, ctx);
  if (!project) {
    throw new NotFoundError({ message: "Project not found" });
  }
}

export async function listProjectFiles(
  projectId: string,
  ctx: RequestContext,
): Promise<string[]> {
  await requireProjectAccess(projectId, ctx);
  return getWorkspaceStore().listFiles(projectId, ".", {
    skipDirs: SKIP_DIRS,
  });
}

export async function readProjectFile(
  projectId: string,
  path: string,
  ctx: RequestContext,
): Promise<ProjectFileContent> {
  await requireProjectAccess(projectId, ctx);
  const workspace = getWorkspaceStore();

  // `resolve` rejects traversal and symlink escapes before anything is read.
  const absolute = await workspace.resolve(projectId, path);
  const stat = await fs.stat(absolute).catch(() => null);
  if (!stat?.isFile()) {
    throw new NotFoundError({ message: "File not found" });
  }

  if (stat.size > MAX_FILE_BYTES) {
    return { path, size: stat.size, content: null, reason: "too-large" };
  }
  const content = await workspace.readFile(projectId, path);
  if (content.includes("\u0000")) {
    return { path, size: stat.size, content: null, reason: "binary" };
  }
  return { path, size: stat.size, content, reason: null };
}

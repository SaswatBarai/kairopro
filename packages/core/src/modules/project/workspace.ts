import { getWorkspaceStore } from "../../platform/workspace";
import { commitAll, headCommit, initRepo } from "../version/git.service";

/**
 * Workspace lifecycle for a project. The workspace path is allocated through
 * the WorkspaceStore seam and derived from the project id — never from user
 * input. Stored on the project row at creation (BE-4 exit criterion).
 */

const GITIGNORE = `node_modules/
.next/
.env
dist/
coverage/
`;

const README = `# Scaffolded by KairoPro

This workspace holds the generated application. The template scaffold
(packages/templates/nextjs-shadcn) is copied here in Phase 16.
`;

/**
 * Allocates the workspace for `projectId`, bootstraps the initial files, and
 * makes the initial commit. Idempotent: an existing workspace with a git repo
 * is left as-is.
 */
export async function createWorkspace(projectId: string): Promise<string> {
  const store = getWorkspaceStore();
  const workspacePath = await store.allocate(projectId);

  // Already initialized (has commits) — leave the workspace untouched.
  if (await headCommit(workspacePath)) return workspacePath;

  await bootstrapFile(store, projectId, ".gitignore", GITIGNORE);
  await bootstrapFile(store, projectId, "README.md", README);

  await initRepo(workspacePath);
  await commitAll(workspacePath, "Initial commit");

  return workspacePath;
}

/** Deletes the workspace directory. No-ops when the directory is absent. */
export async function destroyWorkspace(projectId: string): Promise<void> {
  const store = getWorkspaceStore();
  await store.deleteWorkspace(projectId);
}

async function bootstrapFile(
  store: ReturnType<typeof getWorkspaceStore>,
  projectId: string,
  relativePath: string,
  contents: string,
): Promise<void> {
  try {
    await store.readFile(projectId, relativePath);
    return;
  } catch {
    await store.writeFile(projectId, relativePath, contents);
  }
}

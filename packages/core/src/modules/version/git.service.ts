import path from "node:path";
import { simpleGit } from "simple-git";

/**
 * Commit helpers shared by project workspaces (BE-4) and version snapshots
 * (BE-8 / Phase 13). Thin wrappers over simple-git — no business rules.
 */

const GIT_AUTHOR_NAME = "KairoPro";
const GIT_AUTHOR_EMAIL = "bot@kairopro.dev";

/**
 * Initializes a git repository in `dir`. Idempotent: an existing repository
 * is left untouched, so calling this twice on the same workspace is safe.
 */
export async function initRepo(dir: string): Promise<void> {
  const git = simpleGit(dir);
  if (await git.checkIsRepo()) return;
  await git.init();
  await git.addConfig("user.name", GIT_AUTHOR_NAME);
  await git.addConfig("user.email", GIT_AUTHOR_EMAIL);
}

/**
 * Stages everything in `dir` and commits it. Returns the short hash of the
 * new commit (empty commits are allowed so a freshly scaffolded workspace
 * still gets its initial commit).
 */
export async function commitAll(dir: string, message: string): Promise<string> {
  const git = simpleGit(dir);
  await git.add("-A");
  const commit = await git.commit(message, ["--allow-empty"]);
  return commit.commit.slice(0, 7);
}

/**
 * Returns the short hash of HEAD, or null when the repo has no commits.
 * `dir` must own its `.git` — git otherwise climbs to a parent repository
 * and would report that repo's history as this workspace's.
 */
export async function headCommit(dir: string): Promise<string | null> {
  const git = simpleGit(dir);
  try {
    const gitDir = (await git.revparse(["--git-dir"])).trim();
    const resolved = path.isAbsolute(gitDir)
      ? path.resolve(gitDir)
      : path.resolve(dir, gitDir);
    if (resolved !== path.resolve(dir, ".git")) return null;
    const log = await git.log({ maxCount: 1 });
    return log.latest?.hash.slice(0, 7) ?? null;
  } catch {
    return null;
  }
}

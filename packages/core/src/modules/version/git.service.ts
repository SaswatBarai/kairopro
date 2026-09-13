import path from "node:path";
import { simpleGit } from "simple-git";

/**
 * Commit helpers shared by project workspaces (BE-4) and version snapshots
 * (BE-8 / Phase 13). Thin wrappers over simple-git — no business rules.
 */

const GIT_AUTHOR_NAME = "KairoPro";
const GIT_AUTHOR_EMAIL = "bot@kairopro.dev";

/**
 * True when `dir` owns its own `.git`. Git climbs the directory tree, so a
 * bare rev-parse inside a nested workspace would find the parent repo —
 * every check here must be ownership-based, never proximity-based.
 */
async function ownsGitRepo(dir: string): Promise<boolean> {
  const git = simpleGit(dir);
  try {
    const gitDir = (await git.revparse(["--git-dir"])).trim();
    const resolved = path.isAbsolute(gitDir)
      ? path.resolve(gitDir)
      : path.resolve(dir, gitDir);
    return resolved === path.resolve(dir, ".git");
  } catch {
    return false;
  }
}

/**
 * Initializes a git repository in `dir`. Idempotent: an existing repository
 * that `dir` itself owns is left untouched, so calling this twice on the
 * same workspace is safe.
 */
export async function initRepo(dir: string): Promise<void> {
  if (await ownsGitRepo(dir)) return;
  const git = simpleGit(dir);
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
 * Returns the short hash of HEAD, or null when the repo has no commits or
 * when `dir` does not own a repository (e.g. a workspace that has only been
 * allocated but not yet git-initialized).
 */
export async function headCommit(dir: string): Promise<string | null> {
  if (!(await ownsGitRepo(dir))) return null;
  const git = simpleGit(dir);
  try {
    const log = await git.log({ maxCount: 1 });
    return log.latest?.hash.slice(0, 7) ?? null;
  } catch {
    return null;
  }
}

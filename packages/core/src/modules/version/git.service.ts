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

export interface CommitLogEntry {
  hash: string;
  message: string;
  /** ISO 8601. */
  date: string;
}

/** Newest-first commit log. Empty for a repo with no commits. */
export async function log(
  dir: string,
  maxCount?: number,
): Promise<CommitLogEntry[]> {
  if (!(await ownsGitRepo(dir))) return [];
  const git = simpleGit(dir);
  const result = await git.log({ maxCount });
  return result.all.map((entry) => ({
    hash: entry.hash.slice(0, 7),
    message: entry.message,
    date: new Date(entry.date).toISOString(),
  }));
}

export interface RawDiffStat {
  files: { file: string; insertions: number; deletions: number }[];
  insertions: number;
  deletions: number;
}

/** Raw file/line diff stats between two commits — shaping into the
 * contract's `DiffSummary` is `diff.ts`'s job, not this one's. */
export async function diffStat(
  dir: string,
  fromHash: string,
  toHash: string,
): Promise<RawDiffStat> {
  const git = simpleGit(dir);
  const summary = await git.diffSummary([fromHash, toHash]);
  return {
    files: summary.files.map((file) => ({
      file: file.file,
      insertions: "insertions" in file ? file.insertions : 0,
      deletions: "deletions" in file ? file.deletions : 0,
    })),
    insertions: summary.insertions,
    deletions: summary.deletions,
  };
}

/** The raw unified diff between two commits. */
export async function diffRaw(
  dir: string,
  fromHash: string,
  toHash: string,
): Promise<string> {
  const git = simpleGit(dir);
  return git.diff([fromHash, toHash]);
}

/** True when there is nothing staged or unstaged — safe to revert. */
export async function isWorkingTreeClean(dir: string): Promise<boolean> {
  const git = simpleGit(dir);
  const status = await git.status();
  return status.isClean();
}

/**
 * Restores every path tracked at `hash` into the working tree, exactly as
 * it existed then — including paths `hash` deleted later commits restore,
 * via `git checkout <hash> -- .`. Paths that exist now but didn't exist at
 * `hash` are left behind by that command (it only touches paths present in
 * the given tree), so they're removed separately. The result is staged but
 * not committed — `revertToCommit` commits it.
 */
async function checkoutTree(dir: string, hash: string): Promise<void> {
  const git = simpleGit(dir);
  const addedSinceHash = await git.diff([
    "--name-only",
    "--diff-filter=A",
    hash,
    "HEAD",
  ]);
  const pathsToRemove = addedSinceHash
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  await git.raw(["checkout", hash, "--", "."]);
  if (pathsToRemove.length > 0) {
    await git.rm(pathsToRemove);
  }
}

/**
 * Restores the working tree to `hash`'s state and commits the result as a
 * new, forward commit — never rewrites history (`git reset --hard` and
 * `git revert`'s conflict-prone single-commit-reversal semantics are both
 * deliberately avoided; see Phase 13 notes). Returns the new commit's hash.
 */
export async function revertToCommit(
  dir: string,
  hash: string,
  message: string,
): Promise<string> {
  await checkoutTree(dir, hash);
  return commitAll(dir, message);
}

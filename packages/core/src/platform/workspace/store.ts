import { promises as fs } from "node:fs";
import path from "node:path";
import { ValidationError } from "../../lib/errors";

/**
 * WorkspaceStore — the seam every file access goes through. A project's
 * workspace is a directory under the root; all paths are relative to it and
 * confined to it. Traversal (`../`), absolute paths, and symlink escapes are
 * rejected here so the file tools built on top (Phase 9) cannot bypass it.
 */
export interface WorkspaceStore {
  /** Create the project's workspace directory if needed; return its absolute path. */
  allocate(projectId: string): Promise<string>;
  /** Resolve a workspace-relative path to an absolute one, enforcing confinement. */
  resolve(projectId: string, relativePath: string): Promise<string>;
  writeFile(
    projectId: string,
    relativePath: string,
    contents: string,
  ): Promise<void>;
  readFile(projectId: string, relativePath: string): Promise<string>;
  /** Recursively list file paths (POSIX-relative to the workspace). Directory
   * symlinks are never followed — they are listed by name only. */
  listFiles(projectId: string, relativePath?: string): Promise<string[]>;
  /** Delete a file or directory inside the workspace. Refuses the workspace
   * root itself — that is what deleteWorkspace is for. */
  deleteEntry(projectId: string, relativePath: string): Promise<void>;
  /** Delete the project's entire workspace. */
  deleteWorkspace(projectId: string): Promise<void>;
}

const PROJECT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/** True when `path.relative(base, p)` escapes `base` (but a file literally
 * named `..foo` is fine — only real `..` traversal counts). */
function escapes(base: string, p: string): boolean {
  const rel = path.relative(base, p);
  return (
    rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)
  );
}

export class LocalWorkspaceStore implements WorkspaceStore {
  readonly #root: string;
  /** realpath of the root, resolved lazily — the root may be a symlink itself. */
  #realRoot?: string;

  constructor(root: string) {
    if (!path.isAbsolute(root)) {
      throw new ValidationError({
        message: "Workspace root must be an absolute path",
        details: { root },
      });
    }
    this.#root = root;
  }

  async allocate(projectId: string): Promise<string> {
    const workspaceRoot = await this.#workspaceRoot(projectId);
    await fs.mkdir(workspaceRoot, { recursive: true });
    return workspaceRoot;
  }

  async resolve(projectId: string, relativePath: string): Promise<string> {
    return this.#confinedPath(projectId, relativePath);
  }

  async writeFile(
    projectId: string,
    relativePath: string,
    contents: string,
  ): Promise<void> {
    const target = await this.#confinedPath(projectId, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, contents, "utf8");
  }

  async readFile(projectId: string, relativePath: string): Promise<string> {
    const target = await this.#confinedPath(projectId, relativePath);
    return fs.readFile(target, "utf8");
  }

  async listFiles(projectId: string, relativePath = "."): Promise<string[]> {
    const workspaceRoot = await this.#workspaceRoot(projectId);
    const base = await this.#confinedPath(projectId, relativePath);
    if (!(await pathExists(base))) return [];
    const files: string[] = [];
    await this.#walk(base, workspaceRoot, files);
    return files.sort();
  }

  async deleteEntry(projectId: string, relativePath: string): Promise<void> {
    const target = await this.#confinedPath(projectId, relativePath);
    if (target === (await this.#workspaceRoot(projectId))) {
      throw new ValidationError({
        message: "Refusing to delete the workspace root; use deleteWorkspace",
      });
    }
    await fs.rm(target, { recursive: true, force: true });
  }

  async deleteWorkspace(projectId: string): Promise<void> {
    const workspaceRoot = await this.#workspaceRoot(projectId);
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }

  async #workspaceRoot(projectId: string): Promise<string> {
    if (!PROJECT_ID_PATTERN.test(projectId)) {
      throw new ValidationError({
        message: "Invalid project id for a workspace path",
        details: { projectId },
      });
    }
    const realRoot = await this.#getRealRoot();
    return path.join(realRoot, projectId);
  }

  /**
   * The confinement check — the security core of the store.
   *
   * 1. Validate the project id, then resolve textually against the
   *    workspace root (this folds `..`; absolute inputs and traversal that
   *    lands outside the workspace — including elsewhere under the store
   *    root — fail the containment check).
   * 2. Walk up to the nearest existing ancestor and realpath it (symlinks
   *    followed), then re-check containment of the final path — a symlink
   *    inside the workspace pointing outside, including to a sibling
   *    workspace, is an escape and is rejected. Dangling symlinks fail
   *    closed.
   *
   * A plain string prefix comparison is not enough: symlinks (and
   * case-insensitive filesystems) defeat it. This is why the doc calls the
   * traversal test a security test.
   */
  async #confinedPath(
    projectId: string,
    relativePath: string,
  ): Promise<string> {
    if (typeof relativePath !== "string" || relativePath.length === 0) {
      throw new ValidationError({ message: "Path must be a non-empty string" });
    }
    const realRoot = await this.#getRealRoot();
    const workspaceRoot = await this.#workspaceRoot(projectId);
    const target = path.resolve(workspaceRoot, relativePath);

    const relFromWorkspace = path.relative(workspaceRoot, target);
    if (escapes(workspaceRoot, target)) {
      throw new ValidationError({
        message: "Path escapes the workspace root",
        details: { relativePath },
      });
    }

    // Symlink escape: realpath the nearest existing ancestor and re-check
    // containment of the final path against the workspace root.
    let probe = target;
    const tail: string[] = [];
    while (probe !== realRoot && !(await pathExists(probe))) {
      tail.unshift(path.basename(probe));
      probe = path.dirname(probe);
    }
    let realProbe: string;
    try {
      realProbe = await fs.realpath(probe);
    } catch {
      // A symlink that cannot be fully resolved (dangling) — fail closed.
      throw new ValidationError({
        message: "Path resolves outside the workspace root",
        details: { relativePath },
      });
    }
    const final = tail.length === 0 ? realProbe : path.join(realProbe, ...tail);
    if (escapes(workspaceRoot, final)) {
      throw new ValidationError({
        message: "Path resolves outside the workspace root",
        details: { relativePath },
      });
    }
    return final;
  }

  async #getRealRoot(): Promise<string> {
    if (!this.#realRoot) {
      // The store owns the root; create it on first use.
      await fs.mkdir(this.#root, { recursive: true });
      this.#realRoot = await fs.realpath(this.#root);
    }
    return this.#realRoot;
  }

  async #walk(
    dir: string,
    displayBase: string,
    files: string[],
  ): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.#walk(absolute, displayBase, files);
      } else {
        // Symlinked directories land here too: listed by name, never followed.
        files.push(
          path.relative(displayBase, absolute).split(path.sep).join("/"),
        );
      }
    }
  }
}

async function pathExists(absolute: string): Promise<boolean> {
  try {
    await fs.lstat(absolute);
    return true;
  } catch {
    return false;
  }
}

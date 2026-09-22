import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  commitAll,
  diffRaw,
  diffStat,
  discardUncommittedChanges,
  headCommit,
  initRepo,
  isWorkingTreeClean,
  log,
  revertToCommit,
} from "./git.service";

describe("git.service (BE-4)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "kairopro-git-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("initializes a repository", async () => {
    await initRepo(dir);
    expect(await headCommit(dir)).toBeNull();
  });

  it("is idempotent — a second init does not reset the repo", async () => {
    await initRepo(dir);
    const hash = await commitAll(dir, "first");
    await initRepo(dir);
    // The commit from before the second init still exists.
    expect(await headCommit(dir)).toBe(hash);
  });

  it("commitAll returns a short hash and headCommit resolves it", async () => {
    await initRepo(dir);
    const hash = await commitAll(dir, "Initial commit");
    expect(hash).toMatch(/^[0-9a-f]{7}$/);
    expect(await headCommit(dir)).toBe(hash);
  });

  it("initRepo creates a nested repo even when the dir sits inside a parent repo", async () => {
    const parent = mkdtempSync(join(tmpdir(), "kairopro-git-parent-"));
    try {
      await initRepo(parent);
      const child = join(parent, "workspace");
      mkdirSync(child);
      await initRepo(child);
      // The child owns its .git, not the parent's.
      expect(existsSync(join(child, ".git"))).toBe(true);
      const hash = await commitAll(child, "child commit");
      expect(await headCommit(child)).toBe(hash);
      expect(await headCommit(child)).not.toBe(await headCommit(parent));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("headCommit returns null for a dir that lives inside a parent repo but owns no .git", async () => {
    // Without this guard, git climbs to the parent repository and reports
    // its HEAD — createWorkspace would then skip git init entirely.
    const parent = mkdtempSync(join(tmpdir(), "kairopro-git-parent-"));
    try {
      await initRepo(parent);
      await commitAll(parent, "parent commit");
      const child = join(parent, "workspace");
      mkdirSync(child);
      expect(await headCommit(child)).toBeNull();
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("log returns commits newest-first", async () => {
    await initRepo(dir);
    const first = await commitAll(dir, "first");
    const second = await commitAll(dir, "second");

    const entries = await log(dir);

    expect(entries.map((e) => e.hash)).toEqual([second, first]);
    expect(entries[0]!.message).toBe("second");
    expect(entries[1]!.message).toBe("first");
  });

  it("diffStat and diffRaw report the change between two commits", async () => {
    await initRepo(dir);
    writeFileSync(join(dir, "a.txt"), "line1\n");
    const first = await commitAll(dir, "add a.txt");
    writeFileSync(join(dir, "a.txt"), "line1\nline2\n");
    writeFileSync(join(dir, "b.txt"), "new file\n");
    const second = await commitAll(dir, "edit a.txt, add b.txt");

    const stat = await diffStat(dir, first, second);
    expect(stat.files.map((f) => f.file).sort()).toEqual(["a.txt", "b.txt"]);
    expect(stat.insertions).toBeGreaterThan(0);

    const raw = await diffRaw(dir, first, second);
    expect(raw).toContain("a.txt");
    expect(raw).toContain("b.txt");
    expect(raw).toContain("+line2");
  });

  it("isWorkingTreeClean reflects staged and unstaged changes", async () => {
    await initRepo(dir);
    await commitAll(dir, "first");
    expect(await isWorkingTreeClean(dir)).toBe(true);

    writeFileSync(join(dir, "dirty.txt"), "uncommitted\n");
    expect(await isWorkingTreeClean(dir)).toBe(false);
  });

  it("revertToCommit restores the tree at that commit and commits forward, never rewriting history", async () => {
    await initRepo(dir);
    writeFileSync(join(dir, "a.txt"), "v1\n");
    const first = await commitAll(dir, "v1");
    writeFileSync(join(dir, "a.txt"), "v2\n");
    writeFileSync(join(dir, "b.txt"), "added later\n");
    const second = await commitAll(dir, "v2");

    const revertHash = await revertToCommit(dir, first, "Revert: v2");

    expect(await headCommit(dir)).toBe(revertHash);
    // History is linear and forward-only: both prior commits still exist.
    const entries = await log(dir);
    expect(entries.map((e) => e.hash)).toEqual([revertHash, second, first]);

    // The working tree now matches `first`'s state exactly.
    const { readFileSync, existsSync: exists } = await import("node:fs");
    expect(readFileSync(join(dir, "a.txt"), "utf8")).toBe("v1\n");
    expect(exists(join(dir, "b.txt"))).toBe(false);
  });

  it("discardUncommittedChanges restores modified and removes untracked files, never touching history", async () => {
    await initRepo(dir);
    writeFileSync(join(dir, "a.txt"), "committed\n");
    const hash = await commitAll(dir, "initial");

    writeFileSync(join(dir, "a.txt"), "uncommitted edit\n");
    writeFileSync(join(dir, "new-file.txt"), "untracked\n");
    expect(await isWorkingTreeClean(dir)).toBe(false);

    await discardUncommittedChanges(dir);

    expect(await isWorkingTreeClean(dir)).toBe(true);
    expect(await headCommit(dir)).toBe(hash);
    const { readFileSync, existsSync: exists } = await import("node:fs");
    expect(readFileSync(join(dir, "a.txt"), "utf8")).toBe("committed\n");
    expect(exists(join(dir, "new-file.txt"))).toBe(false);
  });
});

import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { commitAll, headCommit, initRepo } from "./git.service";

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
});

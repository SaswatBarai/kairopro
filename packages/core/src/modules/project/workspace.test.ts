import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { headCommit, initRepo } from "../version/git.service";
import { createWorkspace, destroyWorkspace } from "./workspace";

describe("project workspace (BE-4)", () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "kairopro-ws-test-"));
    process.env.KAIROPRO_WORKSPACE_ROOT = root;
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
    delete process.env.KAIROPRO_WORKSPACE_ROOT;
  });

  it("allocates a workspace, git-inits it, and makes the initial commit", async () => {
    const { workspacePath, initialCommitHash } =
      await createWorkspace("prj_ws_test_1");
    expect(workspacePath.startsWith(root)).toBe(true);
    expect(initialCommitHash).toMatch(/^[0-9a-f]{7}$/);
    expect(await headCommit(workspacePath)).toBe(initialCommitHash);
  });

  it("is idempotent — a second createWorkspace does not reset the repo, and reports no new commit", async () => {
    const first = await createWorkspace("prj_ws_test_2");
    const second = await createWorkspace("prj_ws_test_2");
    expect(second.initialCommitHash).toBeNull();
    expect(await headCommit(second.workspacePath)).toBe(
      first.initialCommitHash,
    );
  });

  it("destroyWorkspace removes the directory", async () => {
    const { workspacePath } = await createWorkspace("prj_ws_test_3");
    await destroyWorkspace("prj_ws_test_3");
    await expect(initRepo(workspacePath)).rejects.toThrow();
  });
});

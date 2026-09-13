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
    const path = await createWorkspace("prj_ws_test_1");
    expect(path.startsWith(root)).toBe(true);
    expect(await headCommit(path)).toMatch(/^[0-9a-f]{7}$/);
  });

  it("is idempotent — a second createWorkspace does not reset the repo", async () => {
    const path = await createWorkspace("prj_ws_test_2");
    const hash = await headCommit(path);
    await createWorkspace("prj_ws_test_2");
    expect(await headCommit(path)).toBe(hash);
  });

  it("destroyWorkspace removes the directory", async () => {
    const path = await createWorkspace("prj_ws_test_3");
    await destroyWorkspace("prj_ws_test_3");
    await expect(initRepo(path)).rejects.toThrow();
  });
});

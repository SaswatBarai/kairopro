import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { headCommit, log } from "../../../version/git.service";
import { scaffoldProject } from "./scaffold";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "kairopro-scaffold-test-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("scaffoldProject (AI-6)", () => {
  it("copies the expected file set from the template skeleton", async () => {
    const result = await scaffoldProject({ workspacePath: dir });

    expect(result.templateId).toBe("nextjs-shadcn");
    expect(result.filesCopied).toContain("package.json");
    expect(result.filesCopied).toContain("tsconfig.json");
    expect(result.filesCopied).toContain("prisma/schema.prisma");
    expect(result.filesCopied).toContain("src/app/layout.tsx");
    expect(result.filesCopied).toContain("src/app/page.tsx");
    expect(existsSync(join(dir, "package.json"))).toBe(true);
    expect(existsSync(join(dir, "prisma/schema.prisma"))).toBe(true);
  });

  it("makes a commit with the documented message form", async () => {
    const result = await scaffoldProject({ workspacePath: dir });

    expect(result.commitHash).toMatch(/^[0-9a-f]{7}$/);
    const entries = await log(dir, 1);
    expect(entries[0]!.message).toBe("Scaffold nextjs-shadcn template");
    expect(await headCommit(dir)).toBe(result.commitHash);
  });

  it("is idempotent — a second call against the same workspace makes no new commit", async () => {
    const first = await scaffoldProject({ workspacePath: dir });
    const second = await scaffoldProject({ workspacePath: dir });

    expect(second.commitHash).toBeNull();
    expect(second.filesCopied).toEqual(first.filesCopied);
    // Still exactly one commit in history.
    const entries = await log(dir);
    expect(entries).toHaveLength(1);
  });

  it("throws for an unknown template id", async () => {
    await expect(
      scaffoldProject({ workspacePath: dir, templateId: "does-not-exist" }),
    ).rejects.toThrow();
  });
});

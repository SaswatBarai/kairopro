import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

  it("copies the Prisma client module every generated route imports", async () => {
    const result = await scaffoldProject({ workspacePath: dir });

    expect(result.filesCopied).toContain("src/lib/prisma.ts");
    expect(await readFile(join(dir, "src/lib/prisma.ts"), "utf8")).toContain(
      "export const prisma",
    );
  });

  describe("starting from a clean template", () => {
    it("removes code left by an earlier build, so it can't break the type check", async () => {
      await scaffoldProject({ workspacePath: dir });
      // What a failed build leaves behind: generated files, some broken.
      await mkdir(join(dir, "src/app/api/auth/signup"), { recursive: true });
      await writeFile(
        join(dir, "src/app/api/auth/signup/route.ts"),
        "Here is the fix: ```",
      );
      await writeFile(join(dir, "src/lib/contracts.ts"), "broken");

      await scaffoldProject({ workspacePath: dir });

      expect(existsSync(join(dir, "src/app/api/auth/signup/route.ts"))).toBe(
        false,
      );
      expect(existsSync(join(dir, "src/lib/contracts.ts"))).toBe(false);
      expect(existsSync(join(dir, "src/app/page.tsx"))).toBe(true);
    });

    it("restores a template file that was overwritten", async () => {
      await scaffoldProject({ workspacePath: dir });
      await writeFile(join(dir, "src/app/page.tsx"), "garbage");

      await scaffoldProject({ workspacePath: dir });

      expect(await readFile(join(dir, "src/app/page.tsx"), "utf8")).not.toBe(
        "garbage",
      );
    });

    it("keeps history and installed dependencies", async () => {
      const first = await scaffoldProject({ workspacePath: dir });
      await mkdir(join(dir, "node_modules/left-pad"), { recursive: true });
      await writeFile(join(dir, "node_modules/left-pad/index.js"), "x");
      await writeFile(join(dir, "package-lock.json"), "{}");

      await scaffoldProject({ workspacePath: dir });

      expect(existsSync(join(dir, "node_modules/left-pad/index.js"))).toBe(
        true,
      );
      expect(existsSync(join(dir, "package-lock.json"))).toBe(true);
      const entries = await log(dir, 5);
      expect(entries.map((e) => e.message)).toContain(
        "Scaffold nextjs-shadcn template",
      );
      expect(first.commitHash).toMatch(/^[0-9a-f]{7}$/);
    });
  });

  it("throws for an unknown template id", async () => {
    await expect(
      scaffoldProject({ workspacePath: dir, templateId: "does-not-exist" }),
    ).rejects.toThrow();
  });
});

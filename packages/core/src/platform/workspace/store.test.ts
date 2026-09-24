import {
  existsSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ValidationError } from "../../lib/errors";
import { LocalWorkspaceStore } from "./store";

let root: string;
let store: LocalWorkspaceStore;

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "kairopro-ws-"));
  store = new LocalWorkspaceStore(root);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("LocalWorkspaceStore — happy path", () => {
  it("allocates a workspace, idempotently, under the root", async () => {
    const first = await store.allocate("prj_taskflow");
    const second = await store.allocate("prj_taskflow");
    expect(first).toBe(second);
    expect(first).toBe(path.join(root, "prj_taskflow"));
    expect(path.dirname(first)).toBe(root);
  });

  it("writes with parent creation and reads back (round-trip)", async () => {
    await store.allocate("prj_taskflow");
    await store.writeFile("prj_taskflow", "src/lib/format.ts", "export {};\n");
    await expect(
      store.readFile("prj_taskflow", "src/lib/format.ts"),
    ).resolves.toBe("export {};\n");
  });

  it("resolve returns the absolute confined path", async () => {
    await store.allocate("prj_taskflow");
    await expect(
      store.resolve("prj_taskflow", "src/app/page.tsx"),
    ).resolves.toBe(path.join(root, "prj_taskflow", "src/app/page.tsx"));
  });

  it("lists files recursively as workspace-relative POSIX paths", async () => {
    await store.allocate("prj_taskflow");
    await store.writeFile("prj_taskflow", "package.json", "{}");
    await store.writeFile("prj_taskflow", "src/app/page.tsx", "x");
    await store.writeFile("prj_taskflow", "src/lib/util.ts", "y");

    await expect(store.listFiles("prj_taskflow")).resolves.toEqual([
      "package.json",
      "src/app/page.tsx",
      "src/lib/util.ts",
    ]);
    // A subpath lists the same workspace-relative names, scoped to it.
    await expect(store.listFiles("prj_taskflow", "src/lib")).resolves.toEqual([
      "src/lib/util.ts",
    ]);
    // An unallocated workspace lists as empty rather than throwing.
    await expect(store.listFiles("prj_missing")).resolves.toEqual([]);
  });

  it("leaves out skipped directories at any depth, but keeps files that merely share the name", async () => {
    await store.allocate("prj_taskflow");
    await store.writeFile("prj_taskflow", "src/app/page.tsx", "x");
    await store.writeFile(
      "prj_taskflow",
      "node_modules/left-pad/index.js",
      "y",
    );
    await store.writeFile("prj_taskflow", "src/node_modules/inner/z.js", "z");
    await store.writeFile("prj_taskflow", ".git/HEAD", "ref");
    await store.writeFile("prj_taskflow", "docs/node_modules.md", "notes");

    await expect(
      store.listFiles("prj_taskflow", ".", {
        skipDirs: ["node_modules", ".git"],
      }),
    ).resolves.toEqual(["docs/node_modules.md", "src/app/page.tsx"]);
  });

  it("deletes entries and whole workspaces without touching siblings", async () => {
    await store.allocate("prj_a");
    await store.allocate("prj_b");
    await store.writeFile("prj_a", "src/old.ts", "old");
    await store.writeFile("prj_a", "keep.ts", "keep");
    await store.writeFile("prj_b", "b.ts", "b");

    await store.deleteEntry("prj_a", "src/old.ts");
    await expect(store.listFiles("prj_a")).resolves.toEqual(["keep.ts"]);

    await store.deleteWorkspace("prj_a");
    await expect(store.listFiles("prj_a")).resolves.toEqual([]);
    await expect(store.listFiles("prj_b")).resolves.toEqual(["b.ts"]);
  });
});

describe("LocalWorkspaceStore — confinement (security tests)", () => {
  beforeEach(async () => {
    await store.allocate("prj_taskflow");
    await store.writeFile("prj_taskflow", "note.txt", "inside");
    await store.allocate("prj_other");
    await store.writeFile("prj_other", "secret.txt", "other project");
  });

  it.each([
    ["parent traversal", "../note.txt"],
    ["nested traversal", "src/../../note.txt"],
    ["sibling workspace via traversal", "../prj_other/secret.txt"],
    ["absolute path", "/etc/passwd"],
    ["absolute path via nested resolve", "src/../../../../etc/passwd"],
  ])("rejects %s", async (_label, relativePath) => {
    await expect(
      store.readFile("prj_taskflow", relativePath),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      store.writeFile("prj_taskflow", relativePath, "x"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a file symlink pointing outside the root", async () => {
    symlinkSync("/etc/passwd", path.join(root, "prj_taskflow", "leak.txt"));
    await expect(
      store.readFile("prj_taskflow", "leak.txt"),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      store.writeFile("prj_taskflow", "leak.txt", "x"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a directory symlink escape", async () => {
    symlinkSync("/etc", path.join(root, "prj_taskflow", "etc"));
    await expect(
      store.readFile("prj_taskflow", "etc/passwd"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a cross-workspace symlink", async () => {
    symlinkSync(
      path.join(root, "prj_other", "secret.txt"),
      path.join(root, "prj_taskflow", "shortcut.txt"),
    );
    await expect(
      store.readFile("prj_taskflow", "shortcut.txt"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("fails closed on a dangling symlink", async () => {
    symlinkSync(
      "/nonexistent/target",
      path.join(root, "prj_taskflow", "dangling.txt"),
    );
    await expect(
      store.readFile("prj_taskflow", "dangling.txt"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("keeps confinement when the store root is itself a symlink", async () => {
    const realRoot = mkdtempSync(path.join(os.tmpdir(), "kairopro-ws-real-"));
    const rootLink = path.join(os.tmpdir(), `kairopro-ws-link-${Date.now()}`);
    symlinkSync(realRoot, rootLink);
    try {
      const symlinkedStore = new LocalWorkspaceStore(rootLink);
      await symlinkedStore.allocate("prj_taskflow");
      await symlinkedStore.writeFile("prj_taskflow", "ok.txt", "ok");
      await expect(
        symlinkedStore.readFile("prj_taskflow", "ok.txt"),
      ).resolves.toBe("ok");
      // Traversal through the symlinked root still cannot escape.
      await expect(
        symlinkedStore.readFile("prj_taskflow", "../prj_x/ok.txt"),
      ).rejects.toBeInstanceOf(ValidationError);
    } finally {
      unlinkSync(rootLink);
      rmSync(realRoot, { recursive: true, force: true });
    }
  });

  it("a valid sibling file inside the same workspace still works", async () => {
    await store.writeFile("prj_taskflow", "docs/spec.md", "spec");
    await expect(store.readFile("prj_taskflow", "docs/spec.md")).resolves.toBe(
      "spec",
    );
    // Normal navigation that stays inside — subdirectory then back down.
    await expect(
      store.readFile("prj_taskflow", "docs/../note.txt"),
    ).resolves.toBe("inside");
  });

  it("refuses deleting the workspace root and invalid project ids", async () => {
    await expect(store.deleteEntry("prj_taskflow", ".")).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      store.deleteEntry("prj_taskflow", "./"),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      store.deleteEntry("prj_taskflow", "a/../"),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      store.readFile("../prj_taskflow", "note.txt"),
    ).rejects.toBeInstanceOf(ValidationError);
    // The refusals must not have deleted anything from the workspace.
    await expect(store.listFiles("prj_taskflow")).resolves.toEqual([
      "note.txt",
    ]);
  });

  it("rejects a relative store root at construction", () => {
    expect(() => new LocalWorkspaceStore("relative/path")).toThrow(
      ValidationError,
    );
  });
});

describe("LocalWorkspaceStore — writes stay inside the root", () => {
  it("a rejected traversal write leaves nothing outside", async () => {
    await expect(
      store.writeFile("prj_taskflow", "../escaped.txt", "nope"),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(existsSync(path.join(root, "escaped.txt"))).toBe(false);
  });
});

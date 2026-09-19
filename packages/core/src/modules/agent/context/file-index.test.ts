import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalWorkspaceStore } from "../../../platform/workspace/store";
import { buildFileIndex } from "./file-index";

const projectId = "prj-1";
let root: string;
let store: LocalWorkspaceStore;

beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "kairopro-file-index-"));
  store = new LocalWorkspaceStore(root);
  await store.allocate(projectId);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("buildFileIndex (AI-4)", () => {
  it("extracts imports, exports, purpose, and tags", async () => {
    await store.writeFile(
      projectId,
      "src/models/user.ts",
      [
        "// The User domain model.",
        "export interface User {",
        "  id: string;",
        "}",
      ].join("\n"),
    );
    await store.writeFile(
      projectId,
      "src/api/users.ts",
      [
        "/** Lists users. */",
        'import type { User } from "../models/user";',
        "",
        "export async function listUsers(): Promise<User[]> {",
        "  return [];",
        "}",
      ].join("\n"),
    );

    const index = await buildFileIndex(store, projectId);
    const model = index.find((e) => e.path === "src/models/user.ts");
    const route = index.find((e) => e.path === "src/api/users.ts");

    expect(model).toMatchObject({
      exports: ["User"],
      imports: [],
      tags: ["schema"],
      purpose: "The User domain model.",
    });
    expect(route).toMatchObject({
      exports: ["listUsers"],
      imports: ["../models/user"],
      tags: ["route"],
      purpose: "Lists users.",
    });
  });

  it("skips node_modules and non-indexable extensions", async () => {
    await store.writeFile(projectId, "node_modules/dep/index.js", "noise");
    await store.writeFile(projectId, "public/logo.png", "binary-ish");
    await store.writeFile(projectId, "src/real.ts", "export const x = 1;");

    const index = await buildFileIndex(store, projectId);
    expect(index.map((e) => e.path)).toEqual(["src/real.ts"]);
  });

  it("tags a component and a test file", async () => {
    await store.writeFile(
      projectId,
      "src/components/Button.tsx",
      "export function Button() { return null; }",
    );
    await store.writeFile(
      projectId,
      "src/components/Button.test.tsx",
      "test('x', () => {});",
    );

    const index = await buildFileIndex(store, projectId);
    expect(
      index.find((e) => e.path === "src/components/Button.tsx")?.tags,
    ).toEqual(["component"]);
    expect(
      index.find((e) => e.path === "src/components/Button.test.tsx")?.tags,
    ).toEqual(["component", "test"]);
  });

  it("returns entries sorted by path, deterministically", async () => {
    await store.writeFile(projectId, "b.ts", "");
    await store.writeFile(projectId, "a.ts", "");

    const first = await buildFileIndex(store, projectId);
    const second = await buildFileIndex(store, projectId);

    expect(first.map((e) => e.path)).toEqual(["a.ts", "b.ts"]);
    expect(second).toEqual(first);
  });
});

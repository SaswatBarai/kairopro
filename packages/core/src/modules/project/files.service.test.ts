import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { LocalWorkspaceStore } from "../../platform/workspace/store";

let store: LocalWorkspaceStore;
vi.mock("../../platform/workspace", () => ({
  getWorkspaceStore: () => store,
}));
vi.mock("../org/access", () => ({ ownerOf: vi.fn() }));

import { ownerOf } from "../org/access";
import {
  listProjectFiles,
  MAX_FILE_BYTES,
  readProjectFile,
} from "./files.service";

const ctx = { userId: "u1", orgId: "o1" };
let root: string;

beforeEach(async () => {
  root = mkdtempSync(path.join(os.tmpdir(), "kairopro-files-"));
  store = new LocalWorkspaceStore(root);
  await store.allocate("prj1");
  vi.mocked(ownerOf).mockResolvedValue({ id: "prj1" } as never);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("listProjectFiles", () => {
  it("lists the project's files but not dependencies or build output", async () => {
    await store.writeFile("prj1", "src/app/page.tsx", "x");
    await store.writeFile("prj1", "package.json", "{}");
    await store.writeFile("prj1", "node_modules/react/index.js", "y");
    await store.writeFile("prj1", ".git/HEAD", "ref");
    await store.writeFile("prj1", ".next/server/app.js", "z");

    await expect(listProjectFiles("prj1", ctx)).resolves.toEqual([
      "package.json",
      "src/app/page.tsx",
    ]);
  });

  it("is not found for a project the caller doesn't own", async () => {
    vi.mocked(ownerOf).mockResolvedValue(null as never);
    await expect(listProjectFiles("prj1", ctx)).rejects.toThrow(NotFoundError);
  });
});

describe("readProjectFile", () => {
  it("returns a text file's content and size", async () => {
    await store.writeFile("prj1", "src/a.ts", "export const a = 1;");

    await expect(readProjectFile("prj1", "src/a.ts", ctx)).resolves.toEqual({
      path: "src/a.ts",
      size: 19,
      content: "export const a = 1;",
      reason: null,
    });
  });

  it("reports a binary file instead of sending garbage", async () => {
    await store.writeFile("prj1", "logo.png", "PNG\u0000\u0001\u0002");
    const result = await readProjectFile("prj1", "logo.png", ctx);
    expect(result).toMatchObject({ content: null, reason: "binary" });
  });

  it("reports a file that is too large instead of sending it", async () => {
    await store.writeFile("prj1", "big.txt", "x".repeat(MAX_FILE_BYTES + 1));
    const result = await readProjectFile("prj1", "big.txt", ctx);
    expect(result).toMatchObject({ content: null, reason: "too-large" });
    expect(result.size).toBe(MAX_FILE_BYTES + 1);
  });

  it("is not found for a missing file or a directory", async () => {
    await store.writeFile("prj1", "src/a.ts", "x");
    await expect(readProjectFile("prj1", "src/nope.ts", ctx)).rejects.toThrow(
      NotFoundError,
    );
    await expect(readProjectFile("prj1", "src", ctx)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("refuses a path that escapes the project's workspace", async () => {
    await expect(
      readProjectFile("prj1", "../../etc/passwd", ctx),
    ).rejects.toThrow(ValidationError);
    await expect(readProjectFile("prj1", "/etc/passwd", ctx)).rejects.toThrow(
      ValidationError,
    );
  });

  it("is not found for a project the caller doesn't own, before touching disk", async () => {
    vi.mocked(ownerOf).mockResolvedValue(null as never);
    await store.writeFile("prj1", "src/a.ts", "secret");
    await expect(readProjectFile("prj1", "src/a.ts", ctx)).rejects.toThrow(
      NotFoundError,
    );
  });
});

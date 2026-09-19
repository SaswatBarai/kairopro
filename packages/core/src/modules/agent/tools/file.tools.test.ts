import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "../../../lib/errors";
import { LocalWorkspaceStore } from "../../../platform/workspace/store";
import type { ToolContext } from "./context";
import {
  deleteFileTool,
  editFileTool,
  listFilesTool,
  readFileTool,
  writeFileTool,
} from "./file.tools";

const projectId = "prj-1";
let root: string;
let store: LocalWorkspaceStore;
let context: ToolContext;

beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "kairopro-file-tools-"));
  store = new LocalWorkspaceStore(root);
  await store.allocate(projectId);
  context = {
    ctx: { userId: "user-1", orgId: "org-1" },
    projectId,
    buildId: "build-1",
    workspace: store,
    container: {} as ToolContext["container"],
    containerId: "stub-prj-1",
    onToolCall: vi.fn(),
  };
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("write_file / read_file (AI-2)", () => {
  it("round-trips a write and a read", async () => {
    await writeFileTool.run(
      { path: "src/index.ts", contents: "hello" },
      context,
    );
    const result = await readFileTool.run({ path: "src/index.ts" }, context);
    expect(result).toEqual({ output: "hello", truncated: false });
  });

  it("creates parent directories", async () => {
    await writeFileTool.run({ path: "a/b/c/deep.ts", contents: "x" }, context);
    const result = await readFileTool.run({ path: "a/b/c/deep.ts" }, context);
    expect(result.output).toBe("x");
  });

  it("read_file throws NotFoundError for a missing file", async () => {
    await expect(
      readFileTool.run({ path: "does-not-exist.ts" }, context),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("edit_file (AI-2)", () => {
  it("replaces exactly one occurrence", async () => {
    await writeFileTool.run(
      { path: "f.ts", contents: "const a = 1;\nconst b = 2;" },
      context,
    );

    await editFileTool.run(
      { path: "f.ts", match: "const a = 1;", replacement: "const a = 100;" },
      context,
    );

    const result = await readFileTool.run({ path: "f.ts" }, context);
    expect(result.output).toBe("const a = 100;\nconst b = 2;");
  });

  it("fails loudly when the match has zero occurrences", async () => {
    await writeFileTool.run(
      { path: "f.ts", contents: "const a = 1;" },
      context,
    );

    await expect(
      editFileTool.run(
        { path: "f.ts", match: "const z = 9;", replacement: "x" },
        context,
      ),
    ).rejects.toThrow(ValidationError);
  });

  it("fails loudly when the match is ambiguous (more than one occurrence)", async () => {
    await writeFileTool.run(
      { path: "f.ts", contents: "dup();\ndup();" },
      context,
    );

    await expect(
      editFileTool.run(
        { path: "f.ts", match: "dup();", replacement: "single();" },
        context,
      ),
    ).rejects.toThrow(ValidationError);

    // The file is left untouched on an ambiguous match.
    const result = await readFileTool.run({ path: "f.ts" }, context);
    expect(result.output).toBe("dup();\ndup();");
  });

  it("does not interpret $-patterns in the replacement", async () => {
    await writeFileTool.run({ path: "f.ts", contents: "PLACEHOLDER" }, context);

    await editFileTool.run(
      { path: "f.ts", match: "PLACEHOLDER", replacement: "cost: $&, ref: $1" },
      context,
    );

    const result = await readFileTool.run({ path: "f.ts" }, context);
    expect(result.output).toBe("cost: $&, ref: $1");
  });
});

describe("delete_file (AI-2)", () => {
  it("deletes a file", async () => {
    await writeFileTool.run({ path: "gone.ts", contents: "x" }, context);
    await deleteFileTool.run({ path: "gone.ts" }, context);

    await expect(
      readFileTool.run({ path: "gone.ts" }, context),
    ).rejects.toThrow(NotFoundError);
  });

  it("refuses the workspace root", async () => {
    await expect(deleteFileTool.run({ path: "." }, context)).rejects.toThrow(
      ValidationError,
    );
  });

  it("refuses a path that escapes the workspace", async () => {
    await expect(
      deleteFileTool.run({ path: "../../etc/passwd" }, context),
    ).rejects.toThrow(ValidationError);
  });
});

describe("list_files (AI-2)", () => {
  it("lists files written into the workspace", async () => {
    await writeFileTool.run({ path: "a.ts", contents: "" }, context);
    await writeFileTool.run({ path: "nested/b.ts", contents: "" }, context);

    const result = await listFilesTool.run({}, context);
    expect(result.output.split("\n").sort()).toEqual(["a.ts", "nested/b.ts"]);
  });

  it("reports an empty workspace", async () => {
    const result = await listFilesTool.run({}, context);
    expect(result.output).toBe("(empty)");
  });
});

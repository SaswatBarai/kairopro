import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalWorkspaceStore } from "../../../platform/workspace/store";
import type { ToolContext } from "./context";
import { writeFileTool } from "./file.tools";
import { findSymbolTool, searchCodeTool } from "./search.tools";

const projectId = "prj-1";
let root: string;
let store: LocalWorkspaceStore;
let context: ToolContext;

beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "kairopro-search-tools-"));
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

  await writeFileTool.run(
    {
      path: "src/greeter.ts",
      contents:
        "export function greet(name: string) {\n  return `hello ${name}`;\n}\n",
    },
    context,
  );
  await writeFileTool.run(
    { path: "src/other.ts", contents: "export const x = 1;\n" },
    context,
  );
  await writeFileTool.run(
    {
      path: "node_modules/dep/index.js",
      contents: "function greet() { return 'noise'; }",
    },
    context,
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("search_code (AI-2)", () => {
  it("finds a known string", async () => {
    const result = await searchCodeTool.run(
      { query: "hello ${name}" },
      context,
    );
    expect(result.output).toContain("src/greeter.ts:2:");
  });

  it("respects the default ignore patterns (node_modules)", async () => {
    const result = await searchCodeTool.run({ query: "greet" }, context);
    expect(result.output).toContain("src/greeter.ts");
    expect(result.output).not.toContain("node_modules");
  });

  it("reports no matches for a query that isn't present", async () => {
    const result = await searchCodeTool.run(
      { query: "definitely-not-here" },
      context,
    );
    expect(result.output).toBe("No matches found.");
  });
});

describe("find_symbol (AI-2)", () => {
  it("finds a known declaration", async () => {
    const result = await findSymbolTool.run({ symbol: "greet" }, context);
    expect(result.output).toContain("src/greeter.ts:1:");
  });

  it("ignores node_modules when locating a declaration", async () => {
    const result = await findSymbolTool.run({ symbol: "greet" }, context);
    expect(result.output).not.toContain("node_modules");
  });

  it("reports nothing for an undeclared symbol", async () => {
    const result = await findSymbolTool.run({ symbol: "nope" }, context);
    expect(result.output).toMatch(/No declaration found/);
  });
});

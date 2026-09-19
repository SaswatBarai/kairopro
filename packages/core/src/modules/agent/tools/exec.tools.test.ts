import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeoutError, ValidationError } from "../../../lib/errors";
import { createStubContainerRuntime } from "../../../platform/container/stub";
import { LocalWorkspaceStore } from "../../../platform/workspace/store";
import type { ToolContext } from "./context";
import { runCommandTool } from "./exec.tools";

const projectId = "prj-1";
let root: string;
let store: LocalWorkspaceStore;
let context: ToolContext;

beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "kairopro-exec-tools-"));
  store = new LocalWorkspaceStore(root);
  await store.allocate(projectId);
  context = {
    ctx: { userId: "user-1", orgId: "org-1" },
    projectId,
    buildId: "build-1",
    workspace: store,
    container: createStubContainerRuntime(),
    containerId: "stub-prj-1",
    onToolCall: vi.fn(),
  };
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("run_command (AI-2)", () => {
  it("returns the exit code and output of a normal command", async () => {
    const result = await runCommandTool.run({ cmd: "echo hello" }, context);
    expect(result.output).toContain("exit code: 0");
    expect(result.output).toContain("hello");
  });

  it("runs inside the project workspace as its cwd", async () => {
    await context.workspace.writeFile(projectId, "marker.txt", "present");
    const result = await runCommandTool.run({ cmd: "cat marker.txt" }, context);
    expect(result.output).toContain("present");
  });

  it("rejects a denylisted destructive command before executing", async () => {
    await expect(
      runCommandTool.run({ cmd: "rm -rf /" }, context),
    ).rejects.toThrow(ValidationError);
  });

  it("a command that exceeds its timeout throws a typed TimeoutError", async () => {
    await expect(
      runCommandTool.run({ cmd: "sleep 5", timeoutMs: 50 }, context),
    ).rejects.toThrow(TimeoutError);
  }, 10_000);
});

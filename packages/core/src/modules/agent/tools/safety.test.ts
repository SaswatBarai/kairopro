import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ValidationError } from "../../../lib/errors";
import { LocalWorkspaceStore } from "../../../platform/workspace/store";
import { assertCommandAllowed, confinePath, truncateOutput } from "./safety";

describe("confinePath (AI-2)", () => {
  let root: string;
  let store: LocalWorkspaceStore;
  const projectId = "prj-1";

  beforeEach(async () => {
    root = mkdtempSync(path.join(tmpdir(), "kairopro-tools-"));
    store = new LocalWorkspaceStore(root);
    await store.allocate(projectId);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("resolves a valid sibling path inside the workspace", async () => {
    const resolved = await confinePath(store, projectId, "src/index.ts");
    expect(resolved).toBe(path.join(root, projectId, "src/index.ts"));
  });

  it("rejects `../` traversal", async () => {
    await expect(
      confinePath(store, projectId, "../../etc/passwd"),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects an encoded traversal segment (treated as a literal filename, still confined)", async () => {
    const resolved = await confinePath(
      store,
      projectId,
      "..%2f..%2fetc/passwd",
    );
    expect(resolved.startsWith(path.join(root, projectId))).toBe(true);
  });

  it("rejects an absolute path outside the workspace", async () => {
    await expect(confinePath(store, projectId, "/etc/passwd")).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects a symlink that escapes the workspace", async () => {
    const outside = mkdtempSync(path.join(tmpdir(), "kairopro-outside-"));
    const workspaceRoot = await store.allocate(projectId);
    symlinkSync(outside, path.join(workspaceRoot, "escape"));

    await expect(confinePath(store, projectId, "escape/x")).rejects.toThrow(
      ValidationError,
    );

    rmSync(outside, { recursive: true, force: true });
  });
});

describe("assertCommandAllowed (AI-2)", () => {
  it.each([
    "rm -rf /",
    "rm -fr /",
    "rm -rf ~",
    "rm -rf *",
    "rm --recursive --force /",
    ":(){ :|:& };:",
    "mkfs.ext4 /dev/sda1",
    "dd if=/dev/zero of=/dev/sda",
    "chmod -R 777 /",
    "shutdown -h now",
  ])("rejects %s", (cmd) => {
    expect(() => assertCommandAllowed(cmd)).toThrow(ValidationError);
  });

  it.each([
    "npm install",
    "rm -rf ./dist",
    "rm -rf node_modules",
    "git status",
    "echo hello",
  ])("allows %s", (cmd) => {
    expect(() => assertCommandAllowed(cmd)).not.toThrow();
  });
});

describe("truncateOutput (AI-2)", () => {
  it("passes short output through unchanged", () => {
    const result = truncateOutput("hello world");
    expect(result).toEqual({ content: "hello world", truncated: false });
  });

  it("truncates a 10MB output, preserving head and tail", () => {
    const head = "HEAD-MARKER-";
    const tail = "-TAIL-MARKER";
    const filler = "x".repeat(10 * 1024 * 1024);
    const output = head + filler + tail;

    const result = truncateOutput(output);

    expect(result.truncated).toBe(true);
    expect(result.content.startsWith(head)).toBe(true);
    expect(result.content.endsWith(tail)).toBe(true);
    expect(result.content.length).toBeLessThan(output.length);
    expect(result.content).toMatch(/truncated \d+ bytes/);
  });
});

import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "../../../lib/errors";
import type { ToolContext } from "./context";
import type { Tool } from "./registry";
import { ToolRegistry } from "./registry";

const echoTool: Tool<{ message: string }> = {
  name: "echo",
  description: "Echoes the input back.",
  inputSchema: z.object({ message: z.string().min(1) }),
  async run(input) {
    return { output: input.message, truncated: false };
  },
};

const restrictedTool: Tool<{ n: number }> = {
  name: "restricted",
  description: "Only available to code-gen and fix.",
  inputSchema: z.object({ n: z.number() }),
  phases: ["code-gen", "fix"],
  async run(input) {
    return { output: String(input.n), truncated: false };
  },
};

let registry: ToolRegistry;
let context: ToolContext;

beforeEach(() => {
  registry = new ToolRegistry();
  registry.register(echoTool);
  registry.register(restrictedTool);
  context = {
    ctx: { userId: "user-1", orgId: "org-1" },
    projectId: "prj-1",
    buildId: "build-1",
    workspace: {} as ToolContext["workspace"],
    container: {} as ToolContext["container"],
    containerId: "stub-prj-1",
    onToolCall: vi.fn(),
  };
});

describe("ToolRegistry (AI-2)", () => {
  it("refuses to register the same tool name twice", () => {
    expect(() => registry.register(echoTool)).toThrow(ValidationError);
  });

  it("listForPhase returns unscoped tools everywhere", () => {
    const names = registry.listForPhase("pm-questions").map((t) => t.name);
    expect(names).toContain("echo");
    expect(names).not.toContain("restricted");
  });

  it("listForPhase returns a scoped tool only for its allowed phases", () => {
    expect(registry.listForPhase("code-gen").map((t) => t.name)).toContain(
      "restricted",
    );
    expect(registry.listForPhase("prd").map((t) => t.name)).not.toContain(
      "restricted",
    );
  });

  it("get throws for a phase the tool does not allow", () => {
    expect(() => registry.get("restricted", "prd")).toThrow(ValidationError);
    expect(() => registry.get("restricted", "code-gen")).not.toThrow();
  });

  it("get throws for an unknown tool name", () => {
    expect(() => registry.get("does-not-exist", "code-gen")).toThrow(
      ValidationError,
    );
  });

  it("call validates input, runs the tool, and reports the call", async () => {
    const result = await registry.call(
      "echo",
      "pm-questions",
      { message: "hi" },
      context,
    );

    expect(result).toEqual({ output: "hi", truncated: false });
    expect(context.onToolCall).toHaveBeenCalledWith({
      tool: "echo",
      input: { message: "hi" },
      truncated: false,
    });
  });

  it("call rejects invalid input with a typed error and never runs the tool", async () => {
    const run = vi.spyOn(echoTool, "run");

    await expect(
      registry.call("echo", "pm-questions", { message: "" }, context),
    ).rejects.toThrow(ValidationError);
    expect(run).not.toHaveBeenCalled();
  });

  it("call rejects a phase-denied tool before validating input", async () => {
    await expect(
      registry.call("restricted", "prd", { n: 1 }, context),
    ).rejects.toThrow(ValidationError);
    expect(context.onToolCall).not.toHaveBeenCalled();
  });
});

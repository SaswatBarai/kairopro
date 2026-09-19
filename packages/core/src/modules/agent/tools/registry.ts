import type { z } from "zod";
import { ValidationError } from "../../../lib/errors";
import type { WorkflowPhase } from "../llm/router";
import type { ToolContext } from "./context";

/**
 * Tool registry (Phase 9 / AI-2) — the agent's interface to the workspace.
 * Every tool call goes through `ToolRegistry.call`: input is validated
 * against the tool's own schema, the phase is checked against the tool's
 * allowed phases, and the call is reported through `ToolContext.onToolCall`
 * — no tool implementation duplicates any of that.
 */

export interface ToolResult {
  output: string;
  truncated: boolean;
}

export interface Tool<Input = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<Input>;
  /** Workflow phases allowed to call this tool. Omitted means every phase. */
  phases?: readonly WorkflowPhase[];
  run(input: Input, context: ToolContext): Promise<ToolResult>;
}

export class ToolRegistry {
  readonly #tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.#tools.has(tool.name)) {
      throw new ValidationError({
        message: `Tool "${tool.name}" is already registered`,
      });
    }
    this.#tools.set(tool.name, tool);
  }

  /** Every tool available to `phase` — everything unscoped, plus everything
   * that names it. This is what a phase's agent loop offers the model. */
  listForPhase(phase: WorkflowPhase): Tool[] {
    return [...this.#tools.values()].filter(
      (tool) => !tool.phases || tool.phases.includes(phase),
    );
  }

  /** Looks up a tool by name, scoped to `phase`. Throws — never returns a
   * tool the phase is not allowed to call, even if the name exists. */
  get(name: string, phase: WorkflowPhase): Tool {
    const tool = this.#tools.get(name);
    if (!tool || (tool.phases && !tool.phases.includes(phase))) {
      throw new ValidationError({
        message: `Tool "${name}" is not available for phase "${phase}"`,
        details: { tool: name, phase },
      });
    }
    return tool;
  }

  /** Validates `rawInput` against the tool's schema, runs it, and reports
   * the call via `context.onToolCall`. The one path every caller uses. */
  async call(
    name: string,
    phase: WorkflowPhase,
    rawInput: unknown,
    context: ToolContext,
  ): Promise<ToolResult> {
    const tool = this.get(name, phase);

    const parsed = tool.inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError({
        message: `Invalid input for tool "${name}"`,
        details: parsed.error.flatten(),
      });
    }

    const result = await tool.run(parsed.data, context);
    context.onToolCall({
      tool: name,
      input: parsed.data,
      truncated: result.truncated,
    });
    return result;
  }
}

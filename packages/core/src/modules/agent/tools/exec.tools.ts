import { z } from "zod";
import type { Tool, ToolResult } from "./registry";
import {
  assertCommandAllowed,
  confinePath,
  DEFAULT_COMMAND_TIMEOUT_MS,
  MAX_COMMAND_TIMEOUT_MS,
  truncateOutput,
} from "./safety";

/**
 * Exec tool (Phase 9 / AI-2): the agent's only path to running a shell
 * command, and it always runs inside the project's container
 * (`ContainerRuntime.exec`) — never on the host directly. Until Phase 14,
 * `context.container` is `StubContainerRuntime`, which runs on the host
 * with no isolation; that is a development-only property of the stub, not
 * of this tool.
 */

const RunCommandInput = z.object({
  cmd: z.string().min(1),
  timeoutMs: z.number().int().positive().max(MAX_COMMAND_TIMEOUT_MS).optional(),
});

export const runCommandTool: Tool<z.infer<typeof RunCommandInput>> = {
  name: "run_command",
  description: "Run a shell command inside the project's container.",
  inputSchema: RunCommandInput,
  async run(input, context): Promise<ToolResult> {
    assertCommandAllowed(input.cmd);
    const cwd = await confinePath(context.workspace, context.projectId, ".");

    const result = await context.container.exec({
      containerId: context.containerId,
      cmd: input.cmd,
      cwd,
      timeoutMs: input.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
    });

    const parts = [`exit code: ${result.exitCode}`];
    if (result.stdout) parts.push(`stdout:\n${result.stdout}`);
    if (result.stderr) parts.push(`stderr:\n${result.stderr}`);

    const { content, truncated } = truncateOutput(parts.join("\n\n"));
    return { output: content, truncated };
  },
};

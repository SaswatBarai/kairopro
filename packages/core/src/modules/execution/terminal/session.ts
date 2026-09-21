import { eventBus } from "../../../platform/events";
import type {
  ContainerRuntime,
  ExecResult,
} from "../../../platform/container/runtime";

/**
 * Runs a command in a container and publishes each line onto that
 * container's terminal channel as it arrives (Phase 14 / BE-9) — the seam
 * a workspace terminal UI or an ad hoc agent command (outside a tracked
 * build) subscribes to. A build's own output goes through `BuildEvent`
 * instead, not this.
 */
export interface RunSessionInput {
  runtime: ContainerRuntime;
  containerId: string;
  cmd: string;
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
}

export async function runSession(input: RunSessionInput): Promise<ExecResult> {
  return input.runtime.execStream(
    {
      containerId: input.containerId,
      cmd: input.cmd,
      cwd: input.cwd,
      timeoutMs: input.timeoutMs,
      env: input.env,
    },
    (line) => {
      eventBus.publish(`terminal:${input.containerId}`, {
        containerId: input.containerId,
        line,
        createdAt: new Date().toISOString(),
      });
    },
  );
}

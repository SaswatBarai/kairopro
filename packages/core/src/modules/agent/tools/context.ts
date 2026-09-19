import type { RequestContext } from "../../../lib/context";
import type { ContainerRuntime } from "../../../platform/container/runtime";
import type { WorkspaceStore } from "../../../platform/workspace/store";

/**
 * ToolContext — binds a tool call to a project, its workspace, and the
 * build it runs under (Phase 9 / AI-2).
 */

/** Emitted once per tool call, after it completes. This is the seam
 * Phase 15's build orchestrator uses to turn a tool call into a persisted
 * `BuildLog` row and a published stream event — Phase 9 doesn't own build
 * persistence, so it exposes the hook rather than writing one directly. */
export interface ToolCallEvent {
  tool: string;
  input: unknown;
  truncated: boolean;
}

export interface ToolContext {
  ctx: RequestContext;
  projectId: string;
  buildId: string;
  workspace: WorkspaceStore;
  container: ContainerRuntime;
  /** Opaque id from `ContainerRuntime.provision` — where `run_command` runs. */
  containerId: string;
  onToolCall: (event: ToolCallEvent) => void;
}

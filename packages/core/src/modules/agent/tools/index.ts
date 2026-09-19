import {
  deleteFileTool,
  editFileTool,
  listFilesTool,
  readFileTool,
  writeFileTool,
} from "./file.tools";
import { runCommandTool } from "./exec.tools";
import { findSymbolTool, searchCodeTool } from "./search.tools";
import { ToolRegistry } from "./registry";

/**
 * The default tool registry (Phase 9 / AI-2). Read-only introspection
 * (`read_file`, `list_files`, `search_code`, `find_symbol`) is available to
 * every workflow phase — a phase generating a spec still benefits from
 * looking at what's already there. Workspace-mutating tools
 * (`write_file`, `edit_file`, `delete_file`, `run_command`) are scoped to
 * `code-gen` and `fix`, the only phases that touch generated code — a spec
 * phase (`prd`, `design`, ...) has no business writing files.
 */
export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register(readFileTool);
  registry.register(listFilesTool);
  registry.register(searchCodeTool);
  registry.register(findSymbolTool);

  const codeMutationPhases = ["code-gen", "fix"] as const;
  registry.register({ ...writeFileTool, phases: codeMutationPhases });
  registry.register({ ...editFileTool, phases: codeMutationPhases });
  registry.register({ ...deleteFileTool, phases: codeMutationPhases });
  registry.register({ ...runCommandTool, phases: codeMutationPhases });

  return registry;
}

export const defaultToolRegistry: ToolRegistry = createDefaultToolRegistry();

export { ToolRegistry } from "./registry";
export type { Tool, ToolResult } from "./registry";
export type { ToolCallEvent, ToolContext } from "./context";

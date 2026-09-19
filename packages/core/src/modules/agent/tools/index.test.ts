import { describe, expect, it } from "vitest";
import { WORKFLOW_PHASES } from "../llm/router";
import { createDefaultToolRegistry } from "./index";

describe("default tool registry (AI-2)", () => {
  it("offers read-only tools to every workflow phase", () => {
    const registry = createDefaultToolRegistry();
    for (const phase of WORKFLOW_PHASES) {
      const names = registry.listForPhase(phase).map((t) => t.name);
      expect(names).toEqual(
        expect.arrayContaining([
          "read_file",
          "list_files",
          "search_code",
          "find_symbol",
        ]),
      );
    }
  });

  it("restricts workspace-mutating tools to code-gen and fix", () => {
    const registry = createDefaultToolRegistry();
    const mutating = ["write_file", "edit_file", "delete_file", "run_command"];

    for (const phase of WORKFLOW_PHASES) {
      const names = registry.listForPhase(phase).map((t) => t.name);
      const shouldHaveMutation = phase === "code-gen" || phase === "fix";
      for (const tool of mutating) {
        expect(names.includes(tool)).toBe(shouldHaveMutation);
      }
    }
  });
});

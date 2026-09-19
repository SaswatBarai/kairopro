import { describe, expect, it } from "vitest";
import { WORKFLOW_PHASES, modelFor } from "./router";

describe("router (AI-1)", () => {
  it("maps every workflow phase to a model", () => {
    for (const phase of WORKFLOW_PHASES) {
      expect(modelFor(phase)).toEqual(expect.any(String));
    }
  });

  it("throws for an unknown phase", () => {
    expect(() => modelFor("not-a-phase" as never)).toThrow(/No model mapped/);
  });
});

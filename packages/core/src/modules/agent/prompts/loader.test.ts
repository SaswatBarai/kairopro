import { beforeEach, describe, expect, it } from "vitest";
import { ValidationError } from "../../../lib/errors";
import { clearPromptCache, loadPrompt, renderPrompt } from "./loader";

beforeEach(() => {
  clearPromptCache();
});

describe("loader (AI-3)", () => {
  it("loads a prompt's raw source from disk", () => {
    const source = loadPrompt("system");
    expect(source).toContain("# Role");
  });

  it("caches after the first load", () => {
    const first = loadPrompt("pm-questions");
    const second = loadPrompt("pm-questions");
    expect(first).toBe(second);
  });

  it("throws for a prompt name with no file on disk", () => {
    expect(() => loadPrompt("does-not-exist" as never)).toThrow(
      ValidationError,
    );
  });

  it("interpolates a known variable", () => {
    const rendered = renderPrompt("pm-questions", {
      projectDescription: "a bakery ordering app",
    });
    expect(rendered).toContain("a bakery ordering app");
    expect(rendered).not.toContain("{{projectDescription}}");
  });

  it("throws naming the missing variable, rather than rendering undefined", () => {
    expect(() => renderPrompt("pm-questions", {})).toThrow(
      /missing required variable "projectDescription"/,
    );
  });

  it("the system prompt needs no variables", () => {
    expect(() => renderPrompt("system")).not.toThrow();
  });
});

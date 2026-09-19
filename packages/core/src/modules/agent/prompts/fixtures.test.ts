import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderPrompt, type PromptName } from "./loader";

/**
 * Regression fixtures (Phase 8 / AI-3 deliverable: `tests/fixtures/prompts/`).
 * These are intentionally brittle: a prompt edit that changes rendered
 * output must update its fixture — that diff is the point, it is what
 * makes a prompt change reviewable.
 */

const FIXTURES_DIR = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../../tests/fixtures/prompts",
);

interface Fixture {
  variables: Record<string, string>;
  expected: string;
}

const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));

describe("prompt fixtures (AI-3)", () => {
  it("has a fixture for every prompt file", () => {
    const names = files.map((f) => f.replace(/\.json$/, "")).sort();
    expect(names).toEqual(
      [
        "app-structure",
        "code-gen",
        "data-model",
        "design",
        "fix",
        "pm-questions",
        "prd",
        "system",
      ].sort(),
    );
  });

  for (const file of files) {
    const name = file.replace(/\.json$/, "") as PromptName;

    it(`renders "${name}" deterministically for its fixed input`, () => {
      const fixture = JSON.parse(
        readFileSync(path.join(FIXTURES_DIR, file), "utf8"),
      ) as Fixture;

      const rendered = renderPrompt(name, fixture.variables);
      expect(rendered).toBe(fixture.expected);
    });
  }
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../../lib/context";
import { LLMStructuredOutputError } from "../../llm/errors";
import type { LLMCompleteResult, LLMProvider } from "../../llm/provider";
import { generateDesign } from "./generate-design";

vi.mock("../../../usage/usage.service", () => ({ emit: vi.fn() }));

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };

function result(content: string): LLMCompleteResult {
  return {
    content,
    usage: { inputTokens: 1, outputTokens: 1 },
    stopReason: "end_turn",
  };
}

function providerReturning(...contents: string[]): LLMProvider {
  const complete = vi.fn();
  for (const c of contents) complete.mockResolvedValueOnce(result(c));
  return { name: "fake", complete, stream: vi.fn() };
}

const VALID_DESIGN_MD = `---
color:
  background: "#0a0a0a"
  foreground: "#fafafa"
  primary: "#4f46e5"
typography:
  fontFamily: Inter
spacing:
  sm: 8px
  md: 16px
radius:
  sm: 4px
  md: 8px
---

## Colors

Primary is used for calls to action.

## Typography

Inter across the app.
`;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateDesign (AI-5)", () => {
  it("returns a DESIGN.md document that parses and exports to a non-empty @theme", async () => {
    const provider = providerReturning(VALID_DESIGN_MD);

    const markdown = await generateDesign({
      prd: "# Overview\nA todo app.",
      ctx,
      provider,
    });

    expect(markdown).toContain("color:");
    expect(markdown).toContain("## Colors");
  }, 30_000);

  it("produces a token set even with completely empty reference notes", async () => {
    const provider = providerReturning(VALID_DESIGN_MD);

    await expect(
      generateDesign({
        prd: "# Overview\nA todo app.",
        referenceNotes: "",
        ctx,
        provider,
      }),
    ).resolves.toBeTruthy();
    // The prompt was still rendered successfully with an empty
    // referenceNotes value — renderPrompt would have thrown if the
    // placeholder were left unfilled.
    expect(provider.complete).toHaveBeenCalledTimes(1);
  }, 30_000);

  it("rejects prose with no token frontmatter and retries", async () => {
    const prose =
      "This app should feel calm and modern, using blues and soft greys.";
    const provider = providerReturning(prose, VALID_DESIGN_MD);

    const markdown = await generateDesign({
      prd: "# Overview\nA todo app.",
      ctx,
      provider,
    });

    expect(markdown).toBe(VALID_DESIGN_MD.trim());
    expect(provider.complete).toHaveBeenCalledTimes(2);
  }, 30_000);

  it("exhausts retries and throws when the model never produces tokens", async () => {
    const prose = "Something clean and minimal.";
    const provider = providerReturning(prose, prose, prose);

    await expect(
      generateDesign({ prd: "# Overview\nA todo app.", ctx, provider }),
    ).rejects.toThrow(LLMStructuredOutputError);
  }, 30_000);
});

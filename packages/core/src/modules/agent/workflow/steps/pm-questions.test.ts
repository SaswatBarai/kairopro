import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../../lib/context";
import { LLMStructuredOutputError } from "../../llm/errors";
import { MockProvider } from "../../llm/providers/mock";
import type { LLMCompleteResult, LLMProvider } from "../../llm/provider";
import { generatePmQuestions } from "./pm-questions";

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

const VALID_QUESTIONS = JSON.stringify([
  {
    id: "q1",
    question: "Who can create a new order?",
    options: ["Any signed-in user", "Only admins", "Only approved vendors"],
  },
  {
    id: "q2",
    question: "Does the app need multi-tenant organizations?",
    options: ["Yes", "No"],
  },
  {
    id: "q3",
    question: "Should orders support partial refunds?",
    options: ["Yes", "No", "Not sure — recommend one"],
  },
]);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generatePmQuestions (AI-5)", () => {
  it("runs against the mock provider out of the box (fabricated JSON satisfies the schema)", async () => {
    const questions = await generatePmQuestions({
      projectDescription: "A marketplace for handmade goods.",
      ctx,
      provider: MockProvider,
    });

    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.length).toBeLessThanOrEqual(5);
  });

  it("returns questions within the 3-5 bound, each with options", async () => {
    const provider = providerReturning(VALID_QUESTIONS);

    const questions = await generatePmQuestions({
      projectDescription: "A marketplace for handmade goods.",
      ctx,
      provider,
    });

    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.length).toBeLessThanOrEqual(5);
    for (const q of questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.length).toBeLessThanOrEqual(4);
    }
  });

  it("rejects a response with design-related language and retries", async () => {
    const withDesignLanguage = JSON.stringify([
      {
        id: "q1",
        question: "What color scheme do you prefer?",
        options: ["Blue", "Green"],
      },
      {
        id: "q2",
        question: "Does the app need multi-tenant organizations?",
        options: ["Yes", "No"],
      },
      {
        id: "q3",
        question: "Should orders support partial refunds?",
        options: ["Yes", "No"],
      },
    ]);
    const provider = providerReturning(withDesignLanguage, VALID_QUESTIONS);

    const questions = await generatePmQuestions({
      projectDescription: "A marketplace for handmade goods.",
      ctx,
      provider,
    });

    expect(questions).toHaveLength(3);
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries and throws when design language persists", async () => {
    const withDesignLanguage = JSON.stringify([
      {
        id: "q1",
        question: "What font should we use?",
        options: ["Sans", "Serif"],
      },
      {
        id: "q2",
        question: "Does the app need multi-tenant organizations?",
        options: ["Yes", "No"],
      },
      {
        id: "q3",
        question: "Should orders support partial refunds?",
        options: ["Yes", "No"],
      },
    ]);
    const provider = providerReturning(
      withDesignLanguage,
      withDesignLanguage,
      withDesignLanguage,
    );

    await expect(
      generatePmQuestions({
        projectDescription: "A marketplace for handmade goods.",
        ctx,
        provider,
      }),
    ).rejects.toThrow(LLMStructuredOutputError);
  });
});

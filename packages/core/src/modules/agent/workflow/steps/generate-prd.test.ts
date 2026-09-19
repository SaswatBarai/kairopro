import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PmQuestion } from "@kairopro/contracts";
import type { RequestContext } from "../../../../lib/context";
import { LLMStructuredOutputError } from "../../llm/errors";
import { MockProvider } from "../../llm/providers/mock";
import type { LLMCompleteResult, LLMProvider } from "../../llm/provider";
import { formatPrdForPrompt, generatePrd } from "./generate-prd";

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

const questions: PmQuestion[] = [
  {
    id: "q1",
    question: "Who can create an order?",
    options: ["Anyone", "Admins"],
  },
  { id: "q2", question: "Recurring billing?", options: ["Yes", "No"] },
];

function validPrdJson(assumptions: unknown[] = []): string {
  return JSON.stringify({
    overview: "A marketplace for handmade goods.",
    goals: ["Let sellers list items"],
    nonGoals: [],
    personas: [{ name: "Seller", description: "Lists and manages products" }],
    userStories: [
      { persona: "Seller", story: "As a seller I can list a product" },
    ],
    assumptions,
    businessRules: {
      invariants: ["An order total never changes once paid"],
      stateMachine: [
        {
          entity: "Order",
          states: ["PENDING", "PAID"],
          transitions: [{ from: "PENDING", to: "PAID" }],
        },
      ],
      permissionMatrix: [
        { role: "Seller", entity: "Product", actions: ["create", "update"] },
      ],
      validationRules: ["Product price must be positive"],
      moneyRules: ["Prices are in USD, rounded to 2 decimals"],
      sideEffects: ["Creating an order sends a confirmation email"],
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generatePrd (AI-5)", () => {
  it("returns a PRD with the six business-rules subsections present", async () => {
    const provider = providerReturning(
      validPrdJson([
        { questionId: "q2", assumption: "No recurring billing in v1" },
      ]),
    );

    const prd = await generatePrd({
      projectDescription: "A marketplace for handmade goods.",
      answers: { q1: "Anyone" },
      questions,
      ctx,
      provider,
    });

    expect(prd.businessRules.invariants.length).toBeGreaterThan(0);
    expect(prd.businessRules.stateMachine.length).toBeGreaterThan(0);
    expect(prd.businessRules.permissionMatrix.length).toBeGreaterThan(0);
    expect(prd.businessRules.validationRules.length).toBeGreaterThan(0);
    expect(prd.businessRules.moneyRules.length).toBeGreaterThan(0);
    expect(prd.businessRules.sideEffects.length).toBeGreaterThan(0);
  });

  it("an unanswered question must appear as a labeled assumption, or validation fails and retries", async () => {
    const missingAssumption = providerReturning(
      validPrdJson([]), // q2 unanswered but not covered — must fail
      validPrdJson([
        { questionId: "q2", assumption: "No recurring billing in v1" },
      ]),
    );

    const prd = await generatePrd({
      projectDescription: "A marketplace for handmade goods.",
      answers: { q1: "Anyone" },
      questions,
      ctx,
      provider: missingAssumption,
    });

    expect(prd.assumptions).toEqual([
      { questionId: "q2", assumption: "No recurring billing in v1" },
    ]);
    expect(missingAssumption.complete).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries and throws when the assumption never appears", async () => {
    const alwaysMissing = providerReturning(
      validPrdJson([]),
      validPrdJson([]),
      validPrdJson([]),
    );

    await expect(
      generatePrd({
        projectDescription: "A marketplace for handmade goods.",
        answers: { q1: "Anyone" },
        questions,
        ctx,
        provider: alwaysMissing,
      }),
    ).rejects.toThrow(LLMStructuredOutputError);
  });

  it("requires no assumption coverage when every question is answered", async () => {
    const provider = providerReturning(validPrdJson([]));

    await expect(
      generatePrd({
        projectDescription: "A marketplace for handmade goods.",
        answers: { q1: "Anyone", q2: "No" },
        questions,
        ctx,
        provider,
      }),
    ).resolves.toBeTruthy();
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it("runs against the mock provider out of the box", async () => {
    await expect(
      generatePrd({
        projectDescription: "A marketplace for handmade goods.",
        answers: {},
        questions: [],
        ctx,
        provider: MockProvider,
      }),
    ).resolves.toBeTruthy();
  });
});

describe("formatPrdForPrompt (AI-5)", () => {
  it("renders every business-rules subsection heading", () => {
    const text = formatPrdForPrompt(JSON.parse(validPrdJson()));
    expect(text).toContain("### Invariants");
    expect(text).toContain("### State Machine");
    expect(text).toContain("### Permission Matrix");
    expect(text).toContain("### Validation Rules");
    expect(text).toContain("### Money Rules");
    expect(text).toContain("### Side Effects");
  });
});

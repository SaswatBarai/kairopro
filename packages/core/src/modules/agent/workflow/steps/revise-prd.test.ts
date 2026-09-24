import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../../lib/context";
import { LLMStructuredOutputError } from "../../llm/errors";
import type { LLMCompleteResult, LLMProvider } from "../../llm/provider";
import type { PrdContent } from "../../validators/prd";
import { revisePrd } from "./revise-prd";

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

const currentPrd: PrdContent = {
  overview: "A task manager for small teams.",
  goals: ["Track tasks"],
  nonGoals: [],
  personas: [{ name: "Member", description: "Works on tasks" }],
  userStories: [{ persona: "Member", story: "As a member I can add a task" }],
  assumptions: [
    { questionId: "q1", assumption: "Everyone sees every task" },
    { questionId: "q2", assumption: "No recurring tasks in v1" },
  ],
  businessRules: {
    invariants: ["A task belongs to one project"],
    stateMachine: [
      {
        entity: "Task",
        states: ["open", "done"],
        transitions: [{ from: "open", to: "done" }],
      },
    ],
    permissionMatrix: [
      { role: "Member", entity: "Task", actions: ["create", "update"] },
    ],
    validationRules: ["Title is required"],
    moneyRules: ["N/A — no monetary values"],
    sideEffects: ["Completing a task records a timestamp"],
  },
};

function revisedJson(prd: PrdContent, summary = "Added subtasks."): string {
  return JSON.stringify({ summary, prd });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("revisePrd", () => {
  it("returns the revised PRD and the summary", async () => {
    const revised: PrdContent = {
      ...currentPrd,
      goals: ["Track tasks", "Break tasks into subtasks"],
    };
    const provider = providerReturning(revisedJson(revised, "Added subtasks."));

    const out = await revisePrd({
      currentPrd,
      instruction: "Add subtasks to tasks",
      ctx,
      provider,
    });

    expect(out.summary).toBe("Added subtasks.");
    expect(out.prd.goals).toContain("Break tasks into subtasks");
  });

  it("sends the current PRD and the instruction to the model", async () => {
    const provider = providerReturning(revisedJson(currentPrd));

    await revisePrd({
      currentPrd,
      instruction: "Add subtasks to tasks",
      ctx,
      provider,
    });

    const { messages } = vi.mocked(provider.complete).mock.calls[0]![0];
    const userMessage = messages.find((m) => m.role === "user")!.content;
    expect(userMessage).toContain("A task manager for small teams.");
    expect(userMessage).toContain("Add subtasks to tasks");
  });

  it("retries when the model drops an existing assumption", async () => {
    const droppedQ2: PrdContent = {
      ...currentPrd,
      assumptions: [currentPrd.assumptions[0]!],
    };
    const provider = providerReturning(
      revisedJson(droppedQ2),
      revisedJson(currentPrd),
    );

    const out = await revisePrd({
      currentPrd,
      instruction: "Add subtasks to tasks",
      ctx,
      provider,
    });

    expect(provider.complete).toHaveBeenCalledTimes(2);
    expect(out.prd.assumptions.map((a) => a.questionId)).toEqual(["q1", "q2"]);
  });

  it("throws once the model keeps dropping assumptions past the retry budget", async () => {
    const droppedAll: PrdContent = { ...currentPrd, assumptions: [] };
    const provider = providerReturning(
      revisedJson(droppedAll),
      revisedJson(droppedAll),
      revisedJson(droppedAll),
    );

    await expect(
      revisePrd({ currentPrd, instruction: "Do a thing", ctx, provider }),
    ).rejects.toThrow(LLMStructuredOutputError);
  });

  it("accepts new assumptions on top of the existing ones", async () => {
    const withNew: PrdContent = {
      ...currentPrd,
      assumptions: [
        ...currentPrd.assumptions,
        { questionId: "subtask_depth", assumption: "Subtasks nest one level" },
      ],
    };
    const provider = providerReturning(revisedJson(withNew));

    const out = await revisePrd({
      currentPrd,
      instruction: "Add subtasks",
      ctx,
      provider,
    });

    expect(out.prd.assumptions).toHaveLength(3);
  });
});

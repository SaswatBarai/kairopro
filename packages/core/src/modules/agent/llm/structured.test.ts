import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../lib/context";
import { LLMStructuredOutputError } from "./errors";
import type { LLMCompleteResult, LLMProvider } from "./provider";
import { completeStructured } from "./structured";

vi.mock("../../usage/usage.service", () => ({
  emit: vi.fn(),
}));

import { emit } from "../../usage/usage.service";

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };
const schema = z.object({ title: z.string(), count: z.number().int() });

function fakeResult(content: string): LLMCompleteResult {
  return {
    content,
    usage: { inputTokens: 10, outputTokens: 5 },
    stopReason: "end_turn",
  };
}

function providerReturning(...contents: string[]): LLMProvider {
  const complete = vi.fn();
  for (const content of contents) {
    complete.mockResolvedValueOnce(fakeResult(content));
  }
  return { name: "fake", complete, stream: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("completeStructured (AI-1)", () => {
  it("returns the parsed value for a valid response", async () => {
    const provider = providerReturning('{"title":"x","count":1}');

    const result = await completeStructured({
      provider,
      model: "m",
      schema,
      messages: [{ role: "user", content: "go" }],
      ctx,
    });

    expect(result).toEqual({ title: "x", count: 1 });
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it("records usage on every attempt", async () => {
    const provider = providerReturning('{"title":"x","count":1}');

    await completeStructured({
      provider,
      model: "m",
      schema,
      messages: [{ role: "user", content: "go" }],
      ctx,
      refs: { projectId: "prj-1" },
    });

    expect(emit).toHaveBeenCalledWith("LLM_TOKENS", 15, ctx, {
      projectId: "prj-1",
    });
  });

  it("retries with the validation error fed back, then succeeds", async () => {
    const provider = providerReturning(
      '{"title":"x","count":"not-a-number"}',
      '{"title":"x","count":1}',
    );

    const result = await completeStructured({
      provider,
      model: "m",
      schema,
      messages: [{ role: "user", content: "go" }],
      ctx,
    });

    expect(result).toEqual({ title: "x", count: 1 });
    expect(provider.complete).toHaveBeenCalledTimes(2);

    const calls = (provider.complete as ReturnType<typeof vi.fn>).mock.calls;
    const secondCallMessages = calls[1]?.[0].messages;
    const lastMessage = secondCallMessages[secondCallMessages.length - 1];
    expect(lastMessage.role).toBe("user");
    expect(lastMessage.content).toMatch(/failed schema validation/);
  });

  it("retries on malformed JSON too", async () => {
    const provider = providerReturning(
      "not json at all",
      '{"title":"x","count":1}',
    );

    const result = await completeStructured({
      provider,
      model: "m",
      schema,
      messages: [{ role: "user", content: "go" }],
      ctx,
    });

    expect(result).toEqual({ title: "x", count: 1 });
  });

  it("exhausts retries and throws LLMStructuredOutputError", async () => {
    const provider = providerReturning("bad-1", "bad-2", "bad-3", "bad-4");

    await expect(
      completeStructured({
        provider,
        model: "m",
        schema,
        messages: [{ role: "user", content: "go" }],
        ctx,
      }),
    ).rejects.toThrow(LLMStructuredOutputError);

    expect(provider.complete).toHaveBeenCalledTimes(3);
  });
});

import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../lib/context";
import { LLMStructuredOutputError } from "./errors";
import type { LLMCompleteResult, LLMProvider } from "./provider";
import {
  completeStructured,
  completeWithValidator,
  stripCodeFence,
} from "./structured";

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

  it("parses JSON wrapped in markdown code blocks and prose", async () => {
    const provider = providerReturning(
      'Here is the response:\n```json\n{"title":"x","count":1}\n```',
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

describe("completeWithValidator (AI-1)", () => {
  it("returns the validator's result for a valid response", async () => {
    const provider = providerReturning("model User { id String }");

    const result = await completeWithValidator({
      provider,
      model: "m",
      messages: [{ role: "user", content: "go" }],
      ctx,
      validate: (content) => content.toUpperCase(),
    });

    expect(result).toBe("MODEL USER { ID STRING }");
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it("supports an async validator", async () => {
    const provider = providerReturning("raw");

    const result = await completeWithValidator({
      provider,
      model: "m",
      messages: [{ role: "user", content: "go" }],
      ctx,
      validate: async (content) => {
        await Promise.resolve();
        return content.length;
      },
    });

    expect(result).toBe(3);
  });

  it("retries with the validator's error fed back, then succeeds", async () => {
    const provider = providerReturning("bad", "good");

    const result = await completeWithValidator({
      provider,
      model: "m",
      messages: [{ role: "user", content: "go" }],
      ctx,
      validate: (content) => {
        if (content !== "good") throw new Error("not good enough");
        return content;
      },
    });

    expect(result).toBe("good");
    expect(provider.complete).toHaveBeenCalledTimes(2);

    const calls = (provider.complete as ReturnType<typeof vi.fn>).mock.calls;
    const secondCallMessages = calls[1]?.[0].messages;
    const lastMessage = secondCallMessages[secondCallMessages.length - 1];
    expect(lastMessage.content).toMatch(/not good enough/);
  });

  it("exhausts retries and throws LLMStructuredOutputError", async () => {
    const provider = providerReturning("bad-1", "bad-2", "bad-3");

    await expect(
      completeWithValidator({
        provider,
        model: "m",
        messages: [{ role: "user", content: "go" }],
        ctx,
        validate: () => {
          throw new Error("always invalid");
        },
      }),
    ).rejects.toThrow(LLMStructuredOutputError);

    expect(provider.complete).toHaveBeenCalledTimes(3);
  });

  it("records usage on every attempt", async () => {
    const provider = providerReturning("x");

    await completeWithValidator({
      provider,
      model: "m",
      messages: [{ role: "user", content: "go" }],
      ctx,
      refs: { projectId: "prj-1" },
      validate: (content) => content,
    });

    expect(emit).toHaveBeenCalledWith("LLM_TOKENS", 15, ctx, {
      projectId: "prj-1",
    });
  });
});

describe("stripCodeFence (AI-5)", () => {
  it("unwraps a language-tagged fence around the whole response", () => {
    // The real shape Claude returns for a DESIGN.md: the `---` frontmatter
    // lands on line 2, which is what broke the YAML parse.
    expect(stripCodeFence('```yaml\n---\ncolor:\n  bg: "#fff"\n---\n```')).toBe(
      '---\ncolor:\n  bg: "#fff"\n---',
    );
  });

  it("unwraps an untagged fence", () => {
    expect(stripCodeFence("```\nmodel User {}\n```")).toBe("model User {}");
  });

  it("leaves a document that merely contains fenced blocks untouched", () => {
    const doc = "---\ntitle: x\n---\n\nUse this:\n\n```ts\nconst a = 1;\n```";
    expect(stripCodeFence(doc)).toBe(doc);
  });

  it("leaves unfenced content untouched", () => {
    expect(stripCodeFence("  model User {}  ")).toBe("model User {}");
  });

  it("is idempotent", () => {
    const once = stripCodeFence("```prisma\nmodel User {}\n```");
    expect(stripCodeFence(once)).toBe(once);
  });

  it("strips the fence before handing content to the validator", async () => {
    const provider = providerReturning("```yaml\n---\nok: true\n---\n```");
    const seen = await completeWithValidator({
      provider,
      model: "m",
      messages: [{ role: "user", content: "go" }],
      ctx,
      validate: (content) => content,
    });
    expect(seen).toBe("---\nok: true\n---");
  });
});

describe("completeWithValidator streaming (build Code Stream)", () => {
  function streamingProvider(...contents: string[]): LLMProvider {
    const queue = [...contents];
    return {
      name: "fake",
      complete: vi.fn(),
      stream: vi.fn(async (_input, onEvent) => {
        const content = queue.shift()!;
        for (const delta of [content.slice(0, 2), content.slice(2)]) {
          onEvent({ delta });
        }
        return fakeResult(content);
      }),
    };
  }

  it("streams the attempt and returns the same validated result", async () => {
    const provider = streamingProvider("hello");
    const deltas: string[] = [];
    const starts = vi.fn();

    const result = await completeWithValidator({
      provider,
      model: "m",
      messages: [{ role: "user", content: "go" }],
      ctx,
      validate: (c) => c.toUpperCase(),
      stream: { onAttemptStart: starts, onDelta: (d) => deltas.push(d) },
    });

    expect(result).toBe("HELLO");
    expect(deltas.join("")).toBe("hello");
    expect(starts).toHaveBeenCalledTimes(1);
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("announces every attempt, so a rejected one can be discarded", async () => {
    const provider = streamingProvider("bad", "good");
    const starts = vi.fn();

    await completeWithValidator({
      provider,
      model: "m",
      messages: [{ role: "user", content: "go" }],
      ctx,
      validate: (c) => {
        if (c !== "good") throw new Error("nope");
        return c;
      },
      stream: { onAttemptStart: starts, onDelta: () => {} },
    });

    expect(starts).toHaveBeenCalledTimes(2);
  });

  it("still strips a wrapping fence before validating", async () => {
    const provider = streamingProvider("```ts\nx\n```");

    const result = await completeWithValidator({
      provider,
      model: "m",
      messages: [{ role: "user", content: "go" }],
      ctx,
      validate: (c) => c,
      stream: { onAttemptStart: () => {}, onDelta: () => {} },
    });

    expect(result).toBe("x");
  });
});

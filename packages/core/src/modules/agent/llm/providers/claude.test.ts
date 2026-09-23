import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { LLMProviderError, LLMTimeoutError } from "../errors";
import type { LLMCompleteInput } from "../provider";
import { createClaudeProvider } from "./claude";

const input: LLMCompleteInput = {
  model: "claude-haiku-4-5",
  messages: [
    { role: "system", content: "be terse" },
    { role: "user", content: "ping" },
  ],
};

function message(
  overrides: Partial<Anthropic.Message> = {},
): Anthropic.Message {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5",
    content: [{ type: "text", text: "pong", citations: [] }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 5,
      output_tokens: 2,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      server_tool_use: null,
      service_tier: null,
    },
    ...overrides,
  } as Anthropic.Message;
}

/** `complete()` is routed through `.messages.stream(...).finalMessage()`
 * (see `claude.ts`), not `.messages.create()` — the SDK rejects a plain
 * non-streaming call outright once `max_tokens` is large enough that the
 * model could plausibly run past 10 minutes, which `DEFAULT_MAX_TOKENS`
 * (64000) does. So the mock client exposes `messages.stream`, matching
 * what `complete()` actually calls. */
function mockClient(streamOpts: {
  finalMessage: Anthropic.Message | (() => Promise<never>);
}): { client: Anthropic; stream: ReturnType<typeof vi.fn> } {
  const finalMessage =
    typeof streamOpts.finalMessage === "function"
      ? vi.fn(streamOpts.finalMessage)
      : vi.fn().mockResolvedValue(streamOpts.finalMessage);
  const stream = vi.fn().mockReturnValue({ finalMessage });
  return {
    client: { messages: { stream } } as unknown as Anthropic,
    stream,
  };
}

describe("Claude provider — complete (AI-1)", () => {
  it("splits system messages out and sends a default max_tokens", async () => {
    const { client, stream } = mockClient({ finalMessage: message() });
    const provider = createClaudeProvider("test-key", client);

    const result = await provider.complete(input);

    expect(result).toEqual({
      content: "pong",
      usage: { inputTokens: 5, outputTokens: 2 },
      stopReason: "end_turn",
    });
    const call = stream.mock.calls[0]![0];
    expect(call.system).toBe("be terse");
    expect(call.messages).toEqual([{ role: "user", content: "ping" }]);
    expect(call.max_tokens).toBe(64000);
  });

  it("honors an explicit maxTokens over the default", async () => {
    const { client, stream } = mockClient({ finalMessage: message() });
    const provider = createClaudeProvider("test-key", client);

    await provider.complete({ ...input, maxTokens: 50 });

    expect(stream.mock.calls[0]![0].max_tokens).toBe(50);
  });

  it('maps stop_reason "max_tokens" through unchanged', async () => {
    const { client } = mockClient({
      finalMessage: message({ stop_reason: "max_tokens" }),
    });
    const provider = createClaudeProvider("test-key", client);

    const result = await provider.complete(input);
    expect(result.stopReason).toBe("max_tokens");
  });

  it("throws LLMProviderError on a refusal stop_reason", async () => {
    const { client } = mockClient({
      finalMessage: message({ stop_reason: "refusal" }),
    });
    const provider = createClaudeProvider("test-key", client);

    await expect(provider.complete(input)).rejects.toThrow(LLMProviderError);
  });

  it("throws a typed LLMProviderError on an APIError", async () => {
    const { client } = mockClient({
      finalMessage: () =>
        Promise.reject(
          new Anthropic.APIError(
            401,
            { error: { message: "bad key" } },
            "bad key",
            undefined,
          ),
        ),
    });
    const provider = createClaudeProvider("test-key", client);

    await expect(provider.complete(input)).rejects.toThrow(LLMProviderError);
  });

  it("throws a typed LLMTimeoutError on APIConnectionTimeoutError", async () => {
    const { client } = mockClient({
      finalMessage: () =>
        Promise.reject(new Anthropic.APIConnectionTimeoutError()),
    });
    const provider = createClaudeProvider("test-key", client);

    await expect(provider.complete(input)).rejects.toThrow(LLMTimeoutError);
  });
});

describe("Claude provider — stream (AI-1)", () => {
  it("emits deltas and returns the accumulated result", async () => {
    const finalMsg = message({
      content: [{ type: "text", text: "hello", citations: [] }],
    });
    const onText = vi.fn();
    const fakeStream = {
      on: vi.fn((event: string, handler: (delta: string) => void) => {
        if (event === "text") {
          onText.mockImplementation(handler);
          handler("hel");
          handler("lo");
        }
        return fakeStream;
      }),
      finalMessage: vi.fn().mockResolvedValue(finalMsg),
    };
    const client = {
      messages: { stream: vi.fn().mockReturnValue(fakeStream) },
    } as unknown as Anthropic;
    const provider = createClaudeProvider("test-key", client);

    const deltas: string[] = [];
    const result = await provider.stream(input, (event) =>
      deltas.push(event.delta),
    );

    expect(deltas).toEqual(["hel", "lo"]);
    expect(result.content).toBe("hello");
  });
});

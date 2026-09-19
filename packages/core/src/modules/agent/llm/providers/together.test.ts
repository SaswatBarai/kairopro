import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LLMProviderError, LLMTimeoutError } from "../errors";
import type { LLMCompleteInput } from "../provider";
import { createTogetherProvider, DEFAULT_TIMEOUT_MS } from "./together";

const input: LLMCompleteInput = {
  model: "zai-org/GLM-5.3-Flash",
  messages: [{ role: "user", content: "ping" }],
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Together provider — complete (AI-1)", () => {
  it("sends the model, messages, and a default max_tokens", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        choices: [{ message: { content: "pong" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 2 },
      }),
    );

    const provider = createTogetherProvider("test-key");
    const result = await provider.complete(input);

    expect(result).toEqual({
      content: "pong",
      usage: { inputTokens: 5, outputTokens: 2 },
      stopReason: "end_turn",
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.together.xyz/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("zai-org/GLM-5.3-Flash");
    expect(body.messages).toEqual(input.messages);
    expect(body.max_tokens).toBe(4096);
    expect(body.stream).toBe(false);
  });

  it("honors an explicit maxTokens over the default", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        choices: [{ message: { content: "x" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    );

    const provider = createTogetherProvider("test-key");
    await provider.complete({ ...input, maxTokens: 50 });

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body.max_tokens).toBe(50);
  });

  it('maps finish_reason "length" to "max_tokens"', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        choices: [
          { message: { content: "truncated" }, finish_reason: "length" },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    );

    const provider = createTogetherProvider("test-key");
    const result = await provider.complete(input);
    expect(result.stopReason).toBe("max_tokens");
  });

  it("throws a typed LLMProviderError on a non-ok response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("unauthorized", { status: 401 }),
    );

    const provider = createTogetherProvider("bad-key");
    await expect(provider.complete(input)).rejects.toThrow(LLMProviderError);
  });

  it("throws a typed LLMProviderError when fetch itself fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const provider = createTogetherProvider("test-key");
    await expect(provider.complete(input)).rejects.toThrow(LLMProviderError);
  });

  it("throws a typed LLMTimeoutError when the call is aborted", async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementationOnce(
        (_url: string, init: { signal: AbortSignal }) => {
          return new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () => {
              const err = new Error("aborted");
              err.name = "AbortError";
              reject(err);
            });
          });
        },
      );

      const provider = createTogetherProvider("test-key");
      // Attach the rejection handler before advancing timers, so the
      // rejection — which fires from an abort-event listener, not
      // synchronously — is never briefly unhandled.
      const assertion = expect(provider.complete(input)).rejects.toThrow(
        LLMTimeoutError,
      );
      await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Together provider — stream (AI-1)", () => {
  it("emits deltas and returns the accumulated result", async () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"hel"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"lo"},"finish_reason":"stop"}],"usage":{"prompt_tokens":3,"completion_tokens":2}}\n\n',
      "data: [DONE]\n\n",
    ];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of sse)
          controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    });
    fetchMock.mockResolvedValueOnce(new Response(body, { status: 200 }));

    const provider = createTogetherProvider("test-key");
    const deltas: string[] = [];
    const result = await provider.stream(input, (event) =>
      deltas.push(event.delta),
    );

    expect(deltas).toEqual(["hel", "lo"]);
    expect(result).toEqual({
      content: "hello",
      usage: { inputTokens: 3, outputTokens: 2 },
      stopReason: "end_turn",
    });
  });

  it("sends stream: true in the request body", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    fetchMock.mockResolvedValueOnce(new Response(body, { status: 200 }));

    const provider = createTogetherProvider("test-key");
    await provider.stream(input, () => {});

    const requestBody = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(requestBody.stream).toBe(true);
  });
});

import { LLMProviderError, LLMTimeoutError } from "../errors";
import type {
  LLMCompleteInput,
  LLMCompleteResult,
  LLMProvider,
  LLMStopReason,
  LLMStreamEvent,
} from "../provider";

/**
 * Together AI provider (Open Item, decided): the concrete `LLMProvider`
 * behind `zai-org/GLM-5.3-Flash` — an OpenAI-compatible chat-completions
 * API. Confirmed live and callable against the real endpoint before this
 * file was written (a raw `curl` returned HTTP 200 with a real completion).
 */

const API_URL = "https://api.together.xyz/v1/chat/completions";
/** Exported for tests — so a timeout test can drive fake timers by the
 * real value instead of duplicating the constant. */
export const DEFAULT_TIMEOUT_MS = 120_000;
/** GLM-5.3-Flash is a reasoning model — it spends tokens thinking before
 * answering. Too low a cap truncates mid-thought with no final answer
 * (verified: `max_tokens: 10` cut off before any `content` appeared). */
const DEFAULT_MAX_TOKENS = 4096;

interface TogetherChoice {
  message?: { content?: string };
  finish_reason?: string;
}

interface TogetherUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface TogetherResponse {
  choices?: TogetherChoice[];
  usage?: TogetherUsage;
}

interface TogetherStreamChunk {
  choices?: { delta?: { content?: string }; finish_reason?: string }[];
  usage?: TogetherUsage;
}

function mapStopReason(reason: string | undefined): LLMStopReason {
  if (reason === "length") return "max_tokens";
  if (reason === "stop" || reason === "eos") return "end_turn";
  return "end_turn";
}

function toRequestBody(input: LLMCompleteInput, stream: boolean) {
  return {
    model: input.model,
    messages: input.messages,
    max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: input.temperature,
    stream,
  };
}

export function createTogetherProvider(apiKey: string): LLMProvider {
  async function callApi(
    input: LLMCompleteInput,
    stream: boolean,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      return await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toRequestBody(input, stream)),
        signal: controller.signal,
      });
    } catch (cause) {
      if (controller.signal.aborted) {
        throw new LLMTimeoutError({
          provider: "together",
          message: `Together API call timed out after ${DEFAULT_TIMEOUT_MS}ms`,
        });
      }
      throw new LLMProviderError({
        provider: "together",
        message: "Together API request failed",
        cause,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async function throwForErrorResponse(res: Response): Promise<never> {
    const body = await res.text().catch(() => "");
    throw new LLMProviderError({
      provider: "together",
      message: `Together API returned ${res.status}`,
      details: { status: res.status, body },
    });
  }

  return {
    name: "together",

    async complete(input: LLMCompleteInput): Promise<LLMCompleteResult> {
      const res = await callApi(input, false);
      if (!res.ok) await throwForErrorResponse(res);

      const data = (await res.json()) as TogetherResponse;
      const choice = data.choices?.[0];

      return {
        content: choice?.message?.content ?? "",
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
        stopReason: mapStopReason(choice?.finish_reason),
      };
    },

    async stream(
      input: LLMCompleteInput,
      onEvent: (event: LLMStreamEvent) => void,
    ): Promise<LLMCompleteResult> {
      const res = await callApi(input, true);
      if (!res.ok) await throwForErrorResponse(res);
      if (!res.body) {
        throw new LLMProviderError({
          provider: "together",
          message: "Together API streaming response had no body",
        });
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";
      let finishReason: string | undefined;
      let usage: TogetherUsage | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice("data:".length).trim();
          if (payload === "[DONE]") continue;

          let parsed: TogetherStreamChunk;
          try {
            parsed = JSON.parse(payload) as TogetherStreamChunk;
          } catch {
            continue; // a partial/malformed SSE frame — skip rather than fail the stream
          }

          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            content += delta;
            onEvent({ delta });
          }
          const reason = parsed.choices?.[0]?.finish_reason;
          if (reason) finishReason = reason;
          if (parsed.usage) usage = parsed.usage;
        }
      }

      return {
        content,
        usage: {
          inputTokens: usage?.prompt_tokens ?? 0,
          outputTokens: usage?.completion_tokens ?? 0,
        },
        stopReason: mapStopReason(finishReason),
      };
    },
  };
}

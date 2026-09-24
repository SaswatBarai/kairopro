import Anthropic from "@anthropic-ai/sdk";
import { LLMProviderError, LLMTimeoutError } from "../errors";
import type {
  LLMCompleteInput,
  LLMCompleteResult,
  LLMMessage,
  LLMProvider,
  LLMStopReason,
  LLMStreamEvent,
} from "../provider";

/**
 * Anthropic (Claude) provider — an `LLMProvider` for `claude-haiku-4-5`,
 * chosen for speed: no extended thinking is requested here, which is what
 * makes it fast relative to the reasoning-heavy Together model this
 * replaced (that model spent thousands of tokens "thinking" before
 * answering on every structured-generation call — see `together.ts`'s own
 * history of `DEFAULT_MAX_TOKENS`/`DEFAULT_TIMEOUT_MS` raises for the real
 * numbers that drove that decision).
 *
 * The Messages API's request shape differs from Together's OpenAI-style
 * chat-completions format in two ways this file has to bridge:
 *  - `system` is a separate top-level field, not a message with
 *    `role: "system"` — every `role: "system"` entry in `LLMCompleteInput`
 *    is pulled out and joined into it.
 *  - A response's `content` is an array of typed blocks, not a single
 *    string — text blocks are concatenated for `LLMCompleteResult.content`.
 */

/** Haiku 4.5's real output ceiling — confirmed live via
 * `client.models.retrieve("claude-haiku-4-5")`, which reports
 * `max_tokens: 64000`. A caller can still override via
 * `LLMCompleteInput.maxTokens`. */
const DEFAULT_MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS) || 64000;
/** Only used for the timeout-classification error message below. The SDK
 * itself is NOT given this as a fixed client timeout — with
 * `DEFAULT_MAX_TOKENS` now at 64000, a hardcoded short timeout would race
 * against the SDK's own default, which auto-scales up for large
 * `max_tokens` on non-streaming requests. Passing an explicit `timeout`
 * would override and defeat that scaling. */
const DEFAULT_TIMEOUT_MS = 60_000;

function splitSystemAndMessages(messages: LLMMessage[]): {
  system: string | undefined;
  rest: Anthropic.MessageParam[];
} {
  const systemParts: string[] = [];
  const rest: Anthropic.MessageParam[] = [];
  for (const message of messages) {
    if (message.role === "system") {
      systemParts.push(message.content);
    } else {
      rest.push({ role: message.role, content: message.content });
    }
  }
  return {
    system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
    rest,
  };
}

function mapStopReason(
  reason: Anthropic.Message["stop_reason"],
): LLMStopReason {
  if (reason === "max_tokens") return "max_tokens";
  if (reason === "stop_sequence") return "stop_sequence";
  // "tool_use" / "pause_turn" never occur — this provider never sends
  // tools; "end_turn" and any other value fall through to the same,
  // correct default.
  return "end_turn";
}

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export function createClaudeProvider(
  apiKey: string,
  client: Anthropic = new Anthropic({ apiKey }),
): LLMProvider {
  function toResult(message: Anthropic.Message): LLMCompleteResult {
    if (message.stop_reason === "refusal") {
      throw new LLMProviderError({
        provider: "anthropic",
        message: "Claude declined to respond (stop_reason: refusal)",
      });
    }
    return {
      content: extractText(message.content),
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
      stopReason: mapStopReason(message.stop_reason),
    };
  }

  function toError(cause: unknown): never {
    if (cause instanceof Anthropic.APIConnectionTimeoutError) {
      throw new LLMTimeoutError({
        provider: "anthropic",
        message: `Anthropic API call timed out after ${DEFAULT_TIMEOUT_MS}ms`,
      });
    }
    if (cause instanceof Anthropic.APIError) {
      throw new LLMProviderError({
        provider: "anthropic",
        message: `Anthropic API returned ${cause.status}`,
        details: { status: cause.status, error: cause.message },
        cause,
      });
    }
    throw new LLMProviderError({
      provider: "anthropic",
      message: "Anthropic API request failed",
      cause,
    });
  }

  return {
    name: "anthropic",

    // Routed through `.stream()` rather than `.messages.create()`: the SDK
    // refuses a plain (non-streaming) request outright — "Streaming is
    // required for operations that may take longer than 10 minutes" — once
    // `max_tokens` is large enough that the model could plausibly run that
    // long, which `DEFAULT_MAX_TOKENS` (64000) does. Streaming has no such
    // cap; this just discards the deltas instead of forwarding them.
    async complete(input: LLMCompleteInput): Promise<LLMCompleteResult> {
      const { system, rest } = splitSystemAndMessages(input.messages);
      try {
        const message = await client.messages
          .stream({
            model: input.model,
            max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
            temperature: input.temperature,
            system,
            messages: rest,
          })
          .finalMessage();
        return toResult(message);
      } catch (cause) {
        return toError(cause);
      }
    },

    async stream(
      input: LLMCompleteInput,
      onEvent: (event: LLMStreamEvent) => void,
    ): Promise<LLMCompleteResult> {
      const { system, rest } = splitSystemAndMessages(input.messages);
      try {
        const stream = client.messages
          .stream({
            model: input.model,
            max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
            temperature: input.temperature,
            system,
            messages: rest,
          })
          .on("text", (delta) => onEvent({ delta }));
        const message = await stream.finalMessage();
        return toResult(message);
      } catch (cause) {
        return toError(cause);
      }
    },
  };
}

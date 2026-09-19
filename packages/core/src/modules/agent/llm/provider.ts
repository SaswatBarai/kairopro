/**
 * LLMProvider — the single interface every AI-track module calls through
 * (Phase 7 / AI-1). Everything downstream (structured output, prompts,
 * tools, workflow steps) is written against this interface only, which is
 * what lets the whole suite run offline against the mock provider. No
 * module outside `providers/` may import a provider SDK.
 */

export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
}

export type LLMStopReason = "end_turn" | "max_tokens" | "stop_sequence";

export interface LLMCompleteInput {
  model: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface LLMCompleteResult {
  content: string;
  usage: LLMUsage;
  stopReason: LLMStopReason;
}

export interface LLMStreamEvent {
  /** Incremental text since the previous event on this stream. */
  delta: string;
}

export interface LLMProvider {
  readonly name: string;
  complete(input: LLMCompleteInput): Promise<LLMCompleteResult>;
  /** Streams incremental output via `onEvent`; resolves with the same shape
   * `complete` would have returned, once the stream ends. */
  stream(
    input: LLMCompleteInput,
    onEvent: (event: LLMStreamEvent) => void,
  ): Promise<LLMCompleteResult>;
}

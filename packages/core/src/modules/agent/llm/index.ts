import { createClaudeProvider } from "./providers/claude";
import { MockProvider } from "./providers/mock";
import { createTogetherProvider } from "./providers/together";
import type { LLMProvider } from "./provider";

/**
 * The provider selector — the single swap point. Anthropic
 * (`claude-haiku-4-5`) is used whenever `ANTHROPIC_API_KEY` is set — checked
 * first since it's the current default — falling back to Together AI
 * (`zai-org/GLM-5.3-Flash`) when only `TOGETHER_API_KEY` is set, and the
 * mock otherwise — except in production, where an unconfigured provider
 * must fail loudly rather than silently serve fabricated data.
 */
let cachedReal: LLMProvider | undefined;

export function getLLMProvider(): LLMProvider {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    cachedReal ??= createClaudeProvider(anthropicKey);
    return cachedReal;
  }

  const togetherKey = process.env.TOGETHER_API_KEY;
  if (togetherKey) {
    cachedReal ??= createTogetherProvider(togetherKey);
    return cachedReal;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "No LLM provider is configured for production — set ANTHROPIC_API_KEY or TOGETHER_API_KEY. The mock must never be selected in production.",
    );
  }

  return MockProvider;
}

import { MockProvider } from "./providers/mock";
import { createTogetherProvider } from "./providers/together";
import type { LLMProvider } from "./provider";

/**
 * The provider selector — the single swap point. Together AI
 * (`zai-org/GLM-5.3-Flash`) is used whenever `TOGETHER_API_KEY` is set;
 * otherwise the mock is selected — except in production, where an
 * unconfigured provider must fail loudly rather than silently serve
 * fabricated data.
 */
let cachedReal: LLMProvider | undefined;

export function getLLMProvider(): LLMProvider {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (apiKey) {
    cachedReal ??= createTogetherProvider(apiKey);
    return cachedReal;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "No LLM provider is configured for production — set TOGETHER_API_KEY. The mock must never be selected in production.",
    );
  }

  return MockProvider;
}

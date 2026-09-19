import { MockProvider } from "./providers/mock";
import type { LLMProvider } from "./provider";

/**
 * The provider selector — the single swap point. Today it always returns
 * the mock (plan §0, "Primary LLM provider: Mock-first" — the concrete
 * choice is deferred to Open Items); once `providers/anthropic.ts` lands,
 * this is the only file that changes.
 */
export function getLLMProvider(): LLMProvider {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "No production LLMProvider is wired yet (Open Items). The mock must never be selected in production.",
    );
  }
  return MockProvider;
}

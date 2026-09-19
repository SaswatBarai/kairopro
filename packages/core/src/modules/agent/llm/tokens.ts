import type { RequestContext } from "../../../lib/context";
import { emit } from "../../usage/usage.service";
import type { LLMUsage } from "./provider";
import { estimateTokens } from "./token-estimate";

export { estimateTokens };

/** Reports a completed call's usage to `UsageService.emit` (BE-4). Zero
 * usage is dropped rather than emitted, since `emit` requires a positive
 * quantity. `emit` itself never throws — metering must never break a call
 * that otherwise succeeded. */
export async function recordCallUsage(
  usage: LLMUsage,
  ctx: RequestContext,
  refs?: { projectId?: string | null; buildId?: string | null },
): Promise<void> {
  const total = usage.inputTokens + usage.outputTokens;
  if (total <= 0) return;
  await emit("LLM_TOKENS", total, ctx, refs);
}

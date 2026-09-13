import { UsageKindSchema, type UsageKind } from "@kairopro/contracts";
import type { RequestContext } from "../../lib/context";
import { ValidationError } from "../../lib/errors";
import { logger, withCorrelation } from "../../platform/logger";
import { recordUsage } from "./usage.repository";

/**
 * Usage metering seam. `emit` is the one place in the codebase where
 * swallowing an error is correct: metering must never break the caller's
 * path (an LLM call or build that succeeded must not fail because a
 * billing row could not be written). Failures are logged and dropped.
 *
 * Emission points (LLM call, build start, container-minute) land in
 * Phases 7/14; this is the seam Gate I-1 consumes.
 */
export async function emit(
  kind: UsageKind,
  quantity: number,
  ctx: RequestContext,
  refs?: { projectId?: string | null; buildId?: string | null },
): Promise<void> {
  const parsedKind = UsageKindSchema.safeParse(kind);
  if (!parsedKind.success) {
    throw new ValidationError({
      message: "Invalid usage kind",
      details: parsedKind.error.flatten(),
    });
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError({
      message: "Usage quantity must be a positive integer",
      details: { quantity },
    });
  }

  const log = withCorrelation(logger, {
    projectId: refs?.projectId ?? undefined,
    buildId: refs?.buildId ?? undefined,
  });

  try {
    await recordUsage({
      orgId: ctx.orgId,
      projectId: refs?.projectId ?? null,
      buildId: refs?.buildId ?? null,
      kind: parsedKind.data,
      quantity,
    });
  } catch (cause) {
    // Swallowed by design — metering is best-effort. Never rethrown.
    log.error(
      { kind: parsedKind.data, quantity, orgId: ctx.orgId, err: cause },
      "usage.emit failed; event dropped",
    );
  }
}

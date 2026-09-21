import {
  createInternalErrorRow,
  type InternalErrorRow,
} from "../../build/build.repository";
import type { FailureCategory } from "./classify";

/**
 * Recovery logging (Phase 17 / AI-7) — the one place a recovery outcome
 * becomes an `InternalError` row. Every failure `fix-loop.ts` sees writes
 * one of these, whether it was eventually fixed, degraded, omitted, or
 * halted — "resolved" only means "this unit reached a terminal, reported
 * state," not "nothing went wrong."
 */

export interface RecoveryLogEntry {
  buildId?: string | null;
  /** The unit of work this failure belongs to — usually a file path. */
  step: string;
  errorType: FailureCategory | "never-degradable" | "unrecognized";
  message: string;
  file?: string;
  attempt: number;
  approach: number;
  /** What ultimately happened — "fixed", "degraded:simpler", "omitted",
   * "halted:never-degradable", "halted:unrecognized", "halted:exhausted". */
  resolution: string;
  /** Marks the row resolved — true once the unit reached a working state
   * (fixed, or successfully degraded); false for anything the build still
   * needs a human to look at (halted, omitted). */
  resolved: boolean;
  detail?: unknown;
}

export async function logRecoveryFailure(
  entry: RecoveryLogEntry,
): Promise<InternalErrorRow> {
  return createInternalErrorRow({
    buildId: entry.buildId ?? null,
    step: entry.step,
    errorType: entry.errorType,
    message: entry.message,
    resolved: entry.resolved,
    resolution: entry.resolution,
    detail: {
      file: entry.file ?? null,
      attempt: entry.attempt,
      approach: entry.approach,
      ...(isPlainObject(entry.detail)
        ? entry.detail
        : { detail: entry.detail ?? null }),
    },
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import { pruneBuildLogsOlderThan } from "../../../modules/build/build.repository";
import { logger } from "../../logger";

/** Build logs older than this are pruned — SSE replay never needs to reach
 * back further than an active build's own lifetime, and finished builds
 * keep their `Version`/`InternalError` rows for history regardless (Phase
 * 19 / BE-11). */
export const LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface PruneLogsResult {
  deleted: number;
}

export async function runPruneLogs(
  retentionMs: number = LOG_RETENTION_MS,
  now: () => number = Date.now,
): Promise<PruneLogsResult> {
  const cutoff = new Date(now() - retentionMs);
  const deleted = await pruneBuildLogsOlderThan(cutoff);
  logger.info({ deleted, cutoff }, "prune-logs: removed old build logs");
  return { deleted };
}

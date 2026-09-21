import type { BuildLogType } from "@kairopro/contracts";
import type { Prisma } from "@kairopro/db";
import { db } from "../../platform/db/client";
import { eventBus } from "../../platform/events";

/** Persists `BuildLog` rows with a per-build monotonic `seq` (Phase 15 /
 * BE-10) — the column SSE reconnect replays from. `@@unique([buildId, seq])`
 * (schema.prisma) is the real guarantee; the retry loop below exists only
 * so a losing writer in a race gets the next free seq instead of failing
 * outright, not to work around a weaker constraint.
 */

const MAX_SEQ_RETRIES = 10;

export type BuildLogRow = Prisma.BuildLogGetPayload<{}>;

async function nextSeq(buildId: string): Promise<number> {
  const last = await db.buildLog.findFirst({
    where: { buildId },
    orderBy: { seq: "desc" },
    select: { seq: true },
  });
  return (last?.seq ?? -1) + 1;
}

function isUniqueConstraintError(cause: unknown): boolean {
  return (cause as { code?: string } | undefined)?.code === "P2002";
}

/** Persists one `BuildLog` row with the next free seq for this build.
 * Retries on a seq collision (another writer took it between our read and
 * our write) rather than surfacing a spurious failure. */
export async function appendLog(
  buildId: string,
  type: BuildLogType,
  content: string,
): Promise<BuildLogRow> {
  for (let attempt = 0; attempt < MAX_SEQ_RETRIES; attempt++) {
    const seq = await nextSeq(buildId);
    try {
      return await db.buildLog.create({ data: { buildId, seq, type, content } });
    } catch (cause) {
      if (!isUniqueConstraintError(cause)) throw cause;
      // Lost the race for this seq — retry with a freshly read one.
    }
  }
  throw new Error(
    `Could not allocate a BuildLog seq for build ${buildId} after ${MAX_SEQ_RETRIES} attempts`,
  );
}

/** Persists the log, then publishes it on the build's event-bus channel —
 * always in that order. A reconnecting SSE client replays from the DB; an
 * event published before its write lands could hand a live subscriber
 * something a replaying client can never find. */
export async function emitLog(
  buildId: string,
  type: BuildLogType,
  content: string,
): Promise<BuildLogRow> {
  const row = await appendLog(buildId, type, content);
  eventBus.publish(`build:${buildId}`, {
    buildId: row.buildId,
    seq: row.seq,
    type: row.type,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  });
  return row;
}

/** Every log after `afterSeq`, oldest first — the SSE reconnect replay
 * query. `afterSeq: -1` returns the whole history. */
export function listLogsSince(
  buildId: string,
  afterSeq: number,
): Promise<BuildLogRow[]> {
  return db.buildLog.findMany({
    where: { buildId, seq: { gt: afterSeq } },
    orderBy: { seq: "asc" },
  });
}

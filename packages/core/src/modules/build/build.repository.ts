import type { Prisma } from "@kairopro/db";
import { db } from "../../platform/db/client";

/** Prisma queries only — business rules live in build.service. */
export type BuildRow = Prisma.BuildGetPayload<{}>;
export type BuildWithProject = Prisma.BuildGetPayload<{
  include: { project: true };
}>;
export type InternalErrorRow = Prisma.InternalErrorGetPayload<{}>;

const ACTIVE_STATUSES = ["QUEUED", "RUNNING"] as const;

export function createBuildRow(projectId: string): Promise<BuildRow> {
  return db.build.create({ data: { projectId } });
}

/** The project's currently in-flight build, if any — the single source of
 * truth for "only one active build per project". */
export function findActiveBuild(projectId: string): Promise<BuildRow | null> {
  return db.build.findFirst({
    where: { projectId, status: { in: [...ACTIVE_STATUSES] } },
  });
}

export function findBuildById(buildId: string): Promise<BuildRow | null> {
  return db.build.findUnique({ where: { id: buildId } });
}

export function findBuildWithProject(
  buildId: string,
): Promise<BuildWithProject | null> {
  return db.build.findUnique({
    where: { id: buildId },
    include: { project: true },
  });
}

export function listBuildsByProject(projectId: string): Promise<BuildRow[]> {
  return db.build.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

/** The most recent successful build with a live preview URL — what `deploy`
 * promotes to production. Null when the project has never built cleanly. */
export function findLatestSucceededBuild(
  projectId: string,
): Promise<BuildRow | null> {
  return db.build.findFirst({
    where: { projectId, status: "SUCCEEDED", previewUrl: { not: null } },
    orderBy: { createdAt: "desc" },
  });
}

/** Deletes build logs older than `cutoff` — `prune-logs` (Phase 19). Returns
 * the number of rows removed. */
export async function pruneBuildLogsOlderThan(cutoff: Date): Promise<number> {
  const result = await db.buildLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}

export function updateBuildRow(
  buildId: string,
  data: Prisma.BuildUpdateInput,
): Promise<BuildRow> {
  return db.build.update({ where: { id: buildId }, data });
}

export function createInternalErrorRow(data: {
  buildId?: string | null;
  step: string;
  errorType: string;
  message: string;
  detail?: Prisma.InputJsonValue;
  resolved?: boolean;
  resolution?: string | null;
}): Promise<InternalErrorRow> {
  return db.internalError.create({ data });
}

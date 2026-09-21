import type { Prisma } from "@kairopro/db";
import { db } from "../../platform/db/client";

/** Prisma queries only — business rules live in build.service. */
export type BuildRow = Prisma.BuildGetPayload<{}>;
export type BuildWithProject = Prisma.BuildGetPayload<{
  include: { project: true };
}>;

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
}): Promise<unknown> {
  return db.internalError.create({ data });
}

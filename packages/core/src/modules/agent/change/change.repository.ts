import type { Prisma } from "@kairopro/db";
import { db } from "../../../platform/db/client";

/** Prisma queries only — business rules live in change-request.ts. */
export type ChangeRequestRow = Prisma.ChangeRequestGetPayload<{}>;

export function createChangeRequestRow(
  projectId: string,
  request: string,
): Promise<ChangeRequestRow> {
  return db.changeRequest.create({ data: { projectId, request } });
}

export function findChangeRequestById(
  id: string,
): Promise<ChangeRequestRow | null> {
  return db.changeRequest.findUnique({ where: { id } });
}

export type ChangeRequestWithProject = Prisma.ChangeRequestGetPayload<{
  include: { project: true };
}>;

export function findChangeRequestWithProject(
  id: string,
): Promise<ChangeRequestWithProject | null> {
  return db.changeRequest.findUnique({
    where: { id },
    include: { project: true },
  });
}

export function listChangeRequestsByProject(
  projectId: string,
): Promise<ChangeRequestRow[]> {
  return db.changeRequest.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

/** The most recent successful changes, newest first — what
 * `change-summary.ts` builds its rolling summary from. */
export function listRecentSucceededChangeRequests(
  projectId: string,
  limit: number,
): Promise<ChangeRequestRow[]> {
  return db.changeRequest.findMany({
    where: { projectId, status: "SUCCEEDED" },
    orderBy: { finishedAt: "desc" },
    take: limit,
  });
}

export function updateChangeRequestRow(
  id: string,
  data: Prisma.ChangeRequestUpdateInput,
): Promise<ChangeRequestRow> {
  return db.changeRequest.update({ where: { id }, data });
}

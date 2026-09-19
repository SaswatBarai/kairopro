import type { Prisma } from "@kairopro/db";
import { db } from "../../platform/db/client";

/** Prisma queries only — business rules live in version.service. */
export type VersionRow = Prisma.VersionGetPayload<{}>;
export type VersionWithProject = Prisma.VersionGetPayload<{
  include: { project: true };
}>;

export function listVersionsByProject(
  projectId: string,
): Promise<VersionRow[]> {
  return db.version.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

export function findVersionWithProject(
  versionId: string,
): Promise<VersionWithProject | null> {
  return db.version.findUnique({
    where: { id: versionId },
    include: { project: true },
  });
}

export function createVersionRow(data: {
  projectId: string;
  hash: string;
  message: string;
  filesChanged: number;
  revertible: boolean;
}): Promise<VersionRow> {
  return db.version.create({ data });
}

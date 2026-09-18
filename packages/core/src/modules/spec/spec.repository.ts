import type { Spec as SpecRow, SpecStatus, SpecType } from "@kairopro/db";
import { db } from "../../platform/db/client";

/** Persistence for Spec rows. Versions are immutable — every write is an insert. */

export async function findLatestSpecsByProject(
  projectId: string,
): Promise<SpecRow[]> {
  const rows = await db.spec.findMany({
    where: { projectId },
    orderBy: { version: "desc" },
  });

  const latestByType = new Map<SpecType, SpecRow>();
  for (const row of rows) {
    if (!latestByType.has(row.type)) {
      latestByType.set(row.type, row);
    }
  }
  return Array.from(latestByType.values());
}

export async function findLatestSpecByType(
  projectId: string,
  type: SpecType,
): Promise<SpecRow | null> {
  return db.spec.findFirst({
    where: { projectId, type },
    orderBy: { version: "desc" },
  });
}

export async function findSpecById(specId: string): Promise<SpecRow | null> {
  return db.spec.findUnique({ where: { id: specId } });
}

export async function findSpecWithProject(specId: string) {
  return db.spec.findUnique({
    where: { id: specId },
    include: { project: true },
  });
}

export async function createSpecVersion(input: {
  projectId: string;
  type: SpecType;
  version: number;
  status: SpecStatus;
  content: unknown;
}): Promise<SpecRow> {
  return db.spec.create({
    data: {
      projectId: input.projectId,
      type: input.type,
      version: input.version,
      status: input.status,
      content: input.content as never,
    },
  });
}

export async function updateSpecStatus(
  specId: string,
  status: SpecStatus,
): Promise<SpecRow> {
  return db.spec.update({ where: { id: specId }, data: { status } });
}

export async function findApprovedSpecsByTypes(
  projectId: string,
  types: SpecType[],
): Promise<SpecRow[]> {
  if (types.length === 0) return [];
  return db.spec.findMany({
    where: { projectId, type: { in: types }, status: "APPROVED" },
  });
}

import {
  Prisma,
  type Project as ProjectRow,
  type UsageEvent as UsageEventRow,
} from "@kairopro/db";
import { db } from "../../platform/db/client";

/**
 * Prisma queries only — no business rules. Callers are project.service and
 * access guards. Return types are annotated explicitly: generated Prisma
 * client types are not portable without a reference.
 */

const listInclude = {
  versions: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { hash: true, createdAt: true },
  },
  builds: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { createdAt: true },
  },
} as const satisfies Prisma.ProjectInclude;

export type ProjectWithActivity = Prisma.ProjectGetPayload<{
  include: typeof listInclude;
}>;

export function createProject(data: {
  orgId: string;
  userId: string;
  name: string;
  description?: string | null;
  status?: ProjectRow["status"];
  templateId?: string;
  workspacePath?: string | null;
}): Promise<ProjectRow> {
  return db.project.create({
    data: {
      orgId: data.orgId,
      userId: data.userId,
      name: data.name,
      description: data.description ?? null,
      status: data.status,
      templateId: data.templateId,
      workspacePath: data.workspacePath,
    },
  });
}

export function findProjectById(id: string): Promise<ProjectRow | null> {
  return db.project.findUnique({ where: { id } });
}

export function findProjectBySubdomain(
  subdomain: string,
): Promise<ProjectRow | null> {
  return db.project.findUnique({ where: { subdomain } });
}

/** Every project with an active build container to sweep for inactivity —
 * anything not yet DEPLOYED, since deployed containers are exempt from
 * `cleanup-inactive` regardless of `lastActiveAt` (Phase 19 exit criterion). */
export function listNonDeployedProjects(): Promise<ProjectRow[]> {
  return db.project.findMany({ where: { status: { not: "DEPLOYED" } } });
}

export function listAllProjectIds(): Promise<{ id: string }[]> {
  return db.project.findMany({ select: { id: true } });
}

export function listProjectsByOrg(
  orgId: string,
): Promise<ProjectWithActivity[]> {
  return db.project.findMany({
    where: { orgId },
    include: listInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export function findProjectWithActivity(
  id: string,
): Promise<ProjectWithActivity | null> {
  return db.project.findUnique({ where: { id }, include: listInclude });
}

export function updateProject(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    status?: ProjectRow["status"];
    workspacePath?: string | null;
    subdomain?: string;
    deployedUrl?: string;
    lastActiveAt?: Date;
  },
): Promise<ProjectRow> {
  return db.project.update({ where: { id }, data });
}

export function deleteProject(id: string): Promise<ProjectRow> {
  return db.project.delete({ where: { id } });
}

/** Bumps `lastActiveAt` to now — the signal `cleanup-inactive` reads to
 * decide whether a preview container is idle. Best-effort: called from
 * build start and from a successful container provision. */
export function touchProjectActivity(id: string): Promise<ProjectRow> {
  return db.project.update({
    where: { id },
    data: { lastActiveAt: new Date() },
  });
}

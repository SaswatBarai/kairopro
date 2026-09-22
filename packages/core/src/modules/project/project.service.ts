import {
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  type CreateProjectInput,
  type Project,
  type ProjectListItem,
  type ProjectStatus,
  type UpdateProjectInput,
} from "@kairopro/contracts";
import type { ZodType } from "zod";
import type { RequestContext } from "../../lib/context";
import type { Project as ProjectRow } from "@kairopro/db";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors";
import { ownerOf } from "../org/access";
import {
  createProject as createProjectRow,
  deleteProject as deleteProjectRow,
  findProjectWithActivity,
  listProjectsByOrg,
  updateProject as updateProjectRow,
  type ProjectWithActivity,
} from "./project.repository";
import { purgeProjectUploads } from "../input/input.service";
import { createVersionRow } from "../version/version.repository";
import { createWorkspace, destroyWorkspace } from "./workspace";

/**
 * Project domain service. Owns business rules — workspace lifecycle, status
 * transitions, contract mapping. Throws typed AppErrors with user-safe
 * messages; cross-tenant failures surface as 404 (never 403) via ownerOf.
 */

/** Legal ProjectStatus transitions. Anything not listed throws ConflictError. */
export const LEGAL_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ["SPECIFYING"],
  SPECIFYING: ["BUILDING"],
  BUILDING: ["READY", "DRAFT"],
  READY: ["DEPLOYED"],
  DEPLOYED: [],
};

/** templateId → stack label rendered on the dashboard card. template.json
 * (Phase 16) replaces this map with machine-readable conventions. */
const STACK_BY_TEMPLATE: Record<string, string> = {
  "nextjs-shadcn": "Next.js + shadcn/ui",
};

function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError({
      message: "Invalid project input",
      details: result.error.flatten(),
    });
  }
  return result.data;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    description: row.description ?? null,
    status: row.status,
    templateId: row.templateId,
    previewUrl: row.previewUrl,
    deployedUrl: row.deployedUrl,
    subdomain: row.subdomain,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toListItem(row: ProjectWithActivity): ProjectListItem {
  const latestVersion = row.versions[0];
  const latestBuild = row.builds[0];
  const lastActivity = [
    row.updatedAt,
    latestVersion?.createdAt,
    latestBuild?.createdAt,
  ]
    .filter((d): d is Date => d instanceof Date)
    .reduce((a, b) => (b > a ? b : a));

  return {
    ...toProject(row),
    stack: STACK_BY_TEMPLATE[row.templateId] ?? null,
    latestCommitHash: latestVersion?.hash ?? null,
    lastActivityAt: lastActivity.toISOString(),
  };
}

export async function createProject(
  input: CreateProjectInput,
  ctx: RequestContext,
): Promise<Project> {
  const data = parseOrThrow(CreateProjectInputSchema, input);

  const row = await createProjectRow({
    orgId: ctx.orgId,
    userId: ctx.userId,
    name: data.name,
    description: data.description ?? null,
  });

  try {
    const { workspacePath, initialCommitHash } = await createWorkspace(row.id);
    const updated = await updateProjectRow(row.id, { workspacePath });
    if (initialCommitHash) {
      // Access is already established (we're inside the flow that just
      // created this project) — write the Version row directly rather
      // than round-tripping through version.service's own access check.
      await createVersionRow({
        projectId: row.id,
        hash: initialCommitHash,
        message: "Initial project",
        filesChanged: 0,
        revertible: false,
      });
    }
    return toProject(updated);
  } catch (cause) {
    // Roll back the row so a failed workspace never leaves a ghost project.
    await deleteProjectRow(row.id);
    throw cause;
  }
}

export async function listProjects(
  ctx: RequestContext,
): Promise<ProjectListItem[]> {
  const rows = await listProjectsByOrg(ctx.orgId);
  return rows.map(toListItem);
}

export async function getProject(
  projectId: string,
  ctx: RequestContext,
): Promise<ProjectListItem> {
  const row = await ownerOf(projectId, ctx);
  if (!row) {
    throw new NotFoundError({ message: "Project not found" });
  }
  const withActivity = await findProjectWithActivity(projectId);
  return toListItem(withActivity!);
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
  ctx: RequestContext,
): Promise<Project> {
  const data = parseOrThrow(UpdateProjectInputSchema, input);
  const row = await ownerOf(projectId, ctx);
  if (!row) {
    throw new NotFoundError({ message: "Project not found" });
  }
  const updated = await updateProjectRow(projectId, {
    name: data.name,
    description: data.description,
  });
  return toProject(updated);
}

export async function deleteProject(
  projectId: string,
  ctx: RequestContext,
): Promise<void> {
  const row = await ownerOf(projectId, ctx);
  if (!row) {
    throw new NotFoundError({ message: "Project not found" });
  }
  await destroyWorkspace(projectId);
  await purgeProjectUploads(projectId);
  await deleteProjectRow(projectId);
}

export async function transitionStatus(
  projectId: string,
  to: ProjectStatus,
  ctx: RequestContext,
): Promise<Project> {
  const row = await ownerOf(projectId, ctx);
  if (!row) {
    throw new NotFoundError({ message: "Project not found" });
  }
  const legal = LEGAL_TRANSITIONS[row.status] ?? [];
  if (!legal.includes(to)) {
    throw new ConflictError({
      message: `Cannot move a project from ${row.status} to ${to}`,
      details: { projectId, from: row.status, to },
    });
  }
  const updated = await updateProjectRow(projectId, { status: to });
  return toProject(updated);
}

import type { Spec, SpecList, SpecType } from "@kairopro/contracts";
import type { Spec as SpecRow } from "@kairopro/db";
import type { RequestContext } from "../../lib/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors";
import { ownerOf } from "../org/access";
import {
  findLatestSpecsByProject,
  findSpecWithProject,
  updateSpecStatus,
} from "./spec.repository";
import { createNextVersion } from "./versioning";
import { staleDownstream } from "./staleness";

/**
 * Spec domain service. Content is opaque JSON at this layer — per-type
 * validation (PRD structure, Prisma-parseable data model, …) is AI-5's
 * concern (Phase 11); this layer only requires it be a JSON object.
 */

const APPROVABLE_STATUSES = new Set(["DRAFT", "PENDING_APPROVAL"]);
const REJECTABLE_STATUSES = new Set(["DRAFT", "PENDING_APPROVAL"]);

function assertJsonObject(content: unknown): Record<string, unknown> {
  if (
    typeof content !== "object" ||
    content === null ||
    Array.isArray(content)
  ) {
    throw new ValidationError({ message: "Spec content must be an object" });
  }
  return content as Record<string, unknown>;
}

function toSpec(row: SpecRow): Spec {
  return {
    id: row.id,
    projectId: row.projectId,
    type: row.type,
    version: row.version,
    status: row.status,
    content: row.content as Spec["content"],
    createdAt: row.createdAt.toISOString(),
  };
}

async function requireProjectAccess(projectId: string, ctx: RequestContext) {
  const project = await ownerOf(projectId, ctx);
  if (!project) {
    throw new NotFoundError({ message: "Project not found" });
  }
  return project;
}

async function requireSpecAccess(specId: string, ctx: RequestContext) {
  const row = await findSpecWithProject(specId);
  if (!row) {
    throw new NotFoundError({ message: "Spec not found" });
  }
  const project = await ownerOf(row.projectId, ctx);
  if (!project) {
    // Spec exists but caller's org doesn't own the project — 404, not 403.
    throw new NotFoundError({ message: "Spec not found" });
  }
  return row;
}

export async function listSpecs(
  projectId: string,
  ctx: RequestContext,
): Promise<SpecList> {
  await requireProjectAccess(projectId, ctx);
  const rows = await findLatestSpecsByProject(projectId);
  return rows.map(toSpec);
}

export async function getSpec(
  specId: string,
  ctx: RequestContext,
): Promise<Spec> {
  const row = await requireSpecAccess(specId, ctx);
  return toSpec(row);
}

/** Internal creation path used by the spec generator (AI-5, Phase 11). */
export async function createSpec(
  projectId: string,
  type: SpecType,
  content: unknown,
  ctx: RequestContext,
): Promise<Spec> {
  await requireProjectAccess(projectId, ctx);
  const data = assertJsonObject(content);
  const row = await createNextVersion(projectId, type, data, "DRAFT");
  return toSpec(row);
}

export async function approveSpec(
  specId: string,
  ctx: RequestContext,
): Promise<Spec> {
  const row = await requireSpecAccess(specId, ctx);
  if (!APPROVABLE_STATUSES.has(row.status)) {
    throw new ConflictError({
      message:
        row.status === "STALE"
          ? "Spec is stale — revise it before it can be approved again"
          : `Spec in status ${row.status} cannot be approved`,
    });
  }

  const approved = await updateSpecStatus(row.id, "APPROVED");
  await staleDownstream(row.projectId, row.type);
  return toSpec(approved);
}

export async function reviseSpec(
  specId: string,
  content: unknown,
  ctx: RequestContext,
): Promise<Spec> {
  const row = await requireSpecAccess(specId, ctx);
  const data = assertJsonObject(content);
  const revised = await createNextVersion(
    row.projectId,
    row.type,
    data,
    "DRAFT",
  );
  return toSpec(revised);
}

export async function rejectSpec(
  specId: string,
  ctx: RequestContext,
): Promise<Spec> {
  const row = await requireSpecAccess(specId, ctx);
  if (!REJECTABLE_STATUSES.has(row.status)) {
    throw new ConflictError({
      message: `Spec in status ${row.status} cannot be rejected`,
    });
  }

  const rejected = await updateSpecStatus(row.id, "REJECTED");
  return toSpec(rejected);
}

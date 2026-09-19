import type { DiffSummary, Version, VersionList } from "@kairopro/contracts";
import type { RequestContext } from "../../lib/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors";
import { ownerOf } from "../org/access";
import { summarizeDiff } from "./diff";
import {
  commitAll,
  diffRaw as gitDiffRaw,
  diffStat as gitDiffStat,
  headCommit,
  isWorkingTreeClean,
  revertToCommit,
} from "./git.service";
import {
  createVersionRow,
  findVersionWithProject,
  listVersionsByProject,
  type VersionRow,
} from "./version.repository";

/**
 * Version domain service (Phase 13 / BE-8) — git-backed history, diffs, and
 * revert. `recordVersion` is the single path every file-touching mutation
 * should go through: it commits and writes the matching `Version` row in
 * the same call, so the DB table and `git log` can never drift apart.
 */

function toVersion(row: VersionRow): Version {
  return {
    id: row.id,
    projectId: row.projectId,
    hash: row.hash,
    message: row.message,
    filesChanged: row.filesChanged,
    revertible: row.revertible,
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

async function requireVersionAccess(versionId: string, ctx: RequestContext) {
  const row = await findVersionWithProject(versionId);
  if (!row) {
    throw new NotFoundError({ message: "Version not found" });
  }
  const project = await ownerOf(row.projectId, ctx);
  if (!project) {
    // A version exists but the caller's org doesn't own its project — 404,
    // not 403, same tenant-isolation rule as everywhere else.
    throw new NotFoundError({ message: "Version not found" });
  }
  return row;
}

/**
 * Commits everything currently in `workspacePath` and records the matching
 * `Version` row. The first version recorded for a project (no parent
 * commit) is never revertible — there is nothing before it to restore.
 */
export async function recordVersion(
  projectId: string,
  workspacePath: string,
  message: string,
  ctx: RequestContext,
): Promise<Version> {
  await requireProjectAccess(projectId, ctx);

  const parent = await headCommit(workspacePath);
  const hash = await commitAll(workspacePath, message);

  let filesChanged = 0;
  if (parent) {
    const stat = await gitDiffStat(workspacePath, parent, hash);
    filesChanged = summarizeDiff(stat).filesChanged;
  }

  const row = await createVersionRow({
    projectId,
    hash,
    message,
    filesChanged,
    revertible: parent !== null,
  });
  return toVersion(row);
}

export async function listVersions(
  projectId: string,
  ctx: RequestContext,
): Promise<VersionList> {
  await requireProjectAccess(projectId, ctx);
  const rows = await listVersionsByProject(projectId);
  return rows.map(toVersion);
}

export interface VersionDiff {
  summary: DiffSummary;
  raw: string;
}

export async function getVersionDiff(
  versionId: string,
  ctx: RequestContext,
): Promise<VersionDiff> {
  const row = await requireVersionAccess(versionId, ctx);

  if (!row.revertible) {
    // The initial commit has no parent to diff against.
    return {
      summary: { filesChanged: 0, insertions: 0, deletions: 0 },
      raw: "",
    };
  }

  const workspacePath = row.project.workspacePath;
  if (!workspacePath) {
    throw new NotFoundError({ message: "Project workspace not found" });
  }

  const parentHash = `${row.hash}^`;
  const stat = await gitDiffStat(workspacePath, parentHash, row.hash);
  const raw = await gitDiffRaw(workspacePath, parentHash, row.hash);
  return { summary: summarizeDiff(stat), raw };
}

export async function revertVersion(
  versionId: string,
  ctx: RequestContext,
): Promise<Version> {
  const row = await requireVersionAccess(versionId, ctx);

  if (!row.revertible) {
    throw new ValidationError({
      message: "The initial commit cannot be reverted",
    });
  }

  const workspacePath = row.project.workspacePath;
  if (!workspacePath) {
    throw new NotFoundError({ message: "Project workspace not found" });
  }

  if (!(await isWorkingTreeClean(workspacePath))) {
    throw new ConflictError({
      message:
        "Workspace has uncommitted changes — commit or discard them before reverting",
    });
  }

  const beforeHash = await headCommit(workspacePath);
  const message = `Revert: ${row.message}`;
  const newHash = await revertToCommit(workspacePath, row.hash, message);

  let filesChanged = 0;
  if (beforeHash) {
    const stat = await gitDiffStat(workspacePath, beforeHash, newHash);
    filesChanged = summarizeDiff(stat).filesChanged;
  }

  const newRow = await createVersionRow({
    projectId: row.projectId,
    hash: newHash,
    message,
    filesChanged,
    // A revert commit always has a parent (the state it reverted from).
    revertible: true,
  });
  return toVersion(newRow);
}

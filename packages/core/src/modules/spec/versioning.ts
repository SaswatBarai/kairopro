import type { Spec as SpecRow, SpecStatus, SpecType } from "@kairopro/db";
import { createSpecVersion, findLatestSpecByType } from "./spec.repository";

/**
 * Every write is a new version row — prior versions are never mutated and
 * remain retrievable by fetching an older `version` number directly.
 */
export async function createNextVersion(
  projectId: string,
  type: SpecType,
  content: unknown,
  status: SpecStatus = "DRAFT",
): Promise<SpecRow> {
  const latest = await findLatestSpecByType(projectId, type);
  const nextVersion = (latest?.version ?? 0) + 1;
  return createSpecVersion({
    projectId,
    type,
    version: nextVersion,
    status,
    content,
  });
}

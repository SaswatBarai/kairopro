import { createInternalErrorRow } from "../../../modules/build/build.repository";
import { findProjectById } from "../../../modules/project/project.repository";
import { logger } from "../../logger";
import { getContainerRuntime } from "../../container";
import type { ContainerRuntime } from "../../container/runtime";

/**
 * Removes containers with no matching project row — left behind by a
 * deleted project, or a failed teardown (Phase 19 / BE-11). A container
 * whose project still exists is always left alone, deployed or not; that
 * distinction belongs to `cleanup-inactive`, not here.
 */

export interface CleanupOrphansResult {
  removed: string[]; // container ids
}

export async function runCleanupOrphans(
  runtime: ContainerRuntime = getContainerRuntime(),
): Promise<CleanupOrphansResult> {
  const managed = await runtime.list();
  const removed: string[] = [];

  for (const { containerId, projectId } of managed) {
    const project = await findProjectById(projectId);
    if (project) continue;

    try {
      await runtime.destroy(containerId);
      removed.push(containerId);
      logger.info(
        { containerId, projectId },
        "cleanup-orphans: removed orphaned container",
      );
    } catch (cause) {
      await createInternalErrorRow({
        buildId: null,
        step: "cleanup-orphans",
        errorType: "container-destroy-failed",
        message: cause instanceof Error ? cause.message : String(cause),
        detail: { projectId, containerId },
        resolved: false,
      });
    }
  }

  return { removed };
}

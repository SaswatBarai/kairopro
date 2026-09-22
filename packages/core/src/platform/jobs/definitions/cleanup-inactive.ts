import { createInternalErrorRow } from "../../../modules/build/build.repository";
import { findProjectById } from "../../../modules/project/project.repository";
import { logger } from "../../logger";
import { getContainerRuntime } from "../../container";
import type { ContainerRuntime } from "../../container/runtime";

/**
 * Stops preview containers that have gone idle (Phase 19 / BE-11). A
 * `DEPLOYED` project is exempt regardless of `lastActiveAt` — that is the
 * highest-consequence check in this phase (getting it backwards takes a
 * customer's live site offline), so it is the very first thing checked per
 * container, before any idle-time arithmetic even runs.
 */

export const INACTIVITY_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface CleanupInactiveResult {
  stopped: string[]; // project ids
}

export async function runCleanupInactive(
  runtime: ContainerRuntime = getContainerRuntime(),
  now: () => number = Date.now,
): Promise<CleanupInactiveResult> {
  const managed = await runtime.list();
  const stopped: string[] = [];

  for (const { containerId, projectId } of managed) {
    const project = await findProjectById(projectId);
    // No matching project: an orphan, not this job's concern (cleanup-orphans).
    if (!project) continue;
    // Deployed apps are never stopped by this job, no matter how idle.
    if (project.status === "DEPLOYED") continue;

    const lastActive = (project.lastActiveAt ?? project.updatedAt).getTime();
    if (now() - lastActive < INACTIVITY_THRESHOLD_MS) continue;

    try {
      await runtime.stop(containerId);
      stopped.push(projectId);
      logger.info(
        { projectId, containerId },
        "cleanup-inactive: stopped idle preview container",
      );
    } catch (cause) {
      await createInternalErrorRow({
        buildId: null,
        step: "cleanup-inactive",
        errorType: "container-stop-failed",
        message: cause instanceof Error ? cause.message : String(cause),
        detail: { projectId, containerId },
        resolved: false,
      });
    }
  }

  return { stopped };
}

import { createInternalErrorRow } from "../../../modules/build/build.repository";
import { getContainerRuntime } from "../../container";
import type { ContainerRuntime } from "../../container/runtime";

/**
 * Probes every managed container's health and records an unresolved
 * `InternalError` row for anything not ready (Phase 19 / BE-11) — the
 * ops-visible surface for "keep the host from silting up" that doesn't stop
 * or remove anything on its own; a human (or a future auto-remediation job)
 * decides what to do with an unhealthy container.
 */

export interface HealthProbeResult {
  unhealthy: string[]; // project ids
}

export async function runHealthProbe(
  runtime: ContainerRuntime = getContainerRuntime(),
): Promise<HealthProbeResult> {
  const managed = await runtime.list();
  const unhealthy: string[] = [];

  for (const { containerId, projectId } of managed) {
    const health = await runtime.health(containerId);
    if (health.ready) continue;

    unhealthy.push(projectId);
    await createInternalErrorRow({
      buildId: null,
      step: "health-probe",
      errorType: "container-unhealthy",
      message: `Container for project ${projectId} is not healthy`,
      detail: { containerId, detail: health.detail ?? null },
      resolved: false,
    });
  }

  return { unhealthy };
}

import type Docker from "dockerode";
import { MANAGED_LABEL, networkNameFor, PROJECT_LABEL } from "./compose";

/**
 * Per-project network lifecycle and orphan detection (Phase 14 / BE-9).
 * Every KairoPro-managed network/container carries `com.kairopro.managed`
 * and `com.kairopro.project-id` labels — that's the only thing orphan
 * detection needs, no separate bookkeeping table.
 */

/** Creates the project's network if it doesn't already exist. Idempotent. */
export async function ensureProjectNetwork(
  docker: Docker,
  projectId: string,
): Promise<string> {
  const name = networkNameFor(projectId);
  const existing = await docker.listNetworks({ filters: { name: [name] } });
  if (existing.some((n) => n.Name === name)) return name;

  await docker.createNetwork({
    Name: name,
    Driver: "bridge",
    Labels: { [MANAGED_LABEL]: "true", [PROJECT_LABEL]: projectId },
  });
  return name;
}

/** Removes the project's network. No-ops if it doesn't exist or still has
 * attached containers (the caller must destroy those first). */
export async function removeProjectNetwork(
  docker: Docker,
  projectId: string,
): Promise<void> {
  const name = networkNameFor(projectId);
  const existing = await docker.listNetworks({ filters: { name: [name] } });
  const match = existing.find((n) => n.Name === name);
  if (!match) return;
  try {
    await docker.getNetwork(match.Id).remove();
  } catch {
    // Already gone, or still in use — caller's destroy sequence handles
    // container teardown first; a lingering network is surfaced by orphan
    // detection instead of failing this call.
  }
}

export interface ManagedResource {
  id: string;
  name: string;
  projectId: string;
}

/** Every network this Docker host has that KairoPro created and labeled. */
export async function listManagedNetworks(
  docker: Docker,
): Promise<ManagedResource[]> {
  const networks = await docker.listNetworks({
    filters: { label: [MANAGED_LABEL] },
  });
  return networks
    .filter((n) => n.Labels?.[PROJECT_LABEL])
    .map((n) => ({
      id: n.Id,
      name: n.Name,
      projectId: n.Labels![PROJECT_LABEL]!,
    }));
}

/** Every container this Docker host has that KairoPro created and labeled. */
export async function listManagedContainers(
  docker: Docker,
): Promise<ManagedResource[]> {
  const containers = await docker.listContainers({
    all: true,
    filters: { label: [MANAGED_LABEL] },
  });
  return containers
    .filter((c) => c.Labels?.[PROJECT_LABEL])
    .map((c) => ({
      id: c.Id,
      name: c.Names[0] ?? c.Id,
      projectId: c.Labels[PROJECT_LABEL]!,
    }));
}

/** Pure — a managed resource whose project id doesn't appear in
 * `knownProjectIds` has no matching project record and is an orphan. */
export function findOrphans(
  managed: ManagedResource[],
  knownProjectIds: readonly string[],
): ManagedResource[] {
  const known = new Set(knownProjectIds);
  return managed.filter((resource) => !known.has(resource.projectId));
}

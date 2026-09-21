import Docker from "dockerode";
import tar from "tar-fs";
import { ProviderError } from "../../../lib/errors";
import type { ComposeSpec } from "./compose";
import { waitForContainerHealthy } from "./health";
import { ensureProjectNetwork, removeProjectNetwork } from "./network";

/**
 * Provision/start/stop/destroy a project's two containers (Phase 14 / BE-9)
 * directly via the Docker Engine API (dockerode) — never by shelling
 * `docker compose`, so decrypted credentials (`ComposeSpec.app.environment`)
 * go straight over the API socket and never touch disk as a compose file.
 * `compose.ts`'s YAML serializer is for the manual/dev script only.
 */

export interface ManagedContainers {
  appContainerId: string;
  dbContainerId: string;
}

function toNanoCpus(cpus: number): number {
  return Math.round(cpus * 1_000_000_000);
}

function toBytes(mb: number): number {
  return mb * 1024 * 1024;
}

async function pullIfMissing(docker: Docker, image: string): Promise<void> {
  const images = await docker.listImages({ filters: { reference: [image] } });
  if (images.length > 0) return;
  await new Promise<void>((resolve, reject) => {
    docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
      if (err) {
        reject(
          new ProviderError({ message: `Failed to pull image ${image}`, cause: err }),
        );
        return;
      }
      docker.modem.followProgress(stream, (followErr) =>
        followErr ? reject(followErr) : resolve(),
      );
    });
  });
}

/**
 * Creates the network, the database container (waiting for it to report
 * healthy before the app container is created — "the database health
 * check gates the app container's start"), and the app container with the
 * project's workspace copied in. Neither container gets a host bind mount.
 */
export async function provisionProject(
  docker: Docker,
  spec: ComposeSpec,
  workspacePath: string,
  dbReadyTimeoutMs = 60_000,
): Promise<ManagedContainers> {
  await ensureProjectNetwork(docker, spec.projectId);
  await pullIfMissing(docker, spec.db.image);
  await pullIfMissing(docker, spec.app.image);

  await docker
    .createVolume({ Name: spec.db.volumeName })
    .catch(() => undefined); // already exists — fine

  const dbContainer = await docker.createContainer({
    Image: spec.db.image,
    name: `kairopro-db-${spec.projectId}`,
    Labels: spec.db.labels,
    Env: Object.entries(spec.db.environment).map(([k, v]) => `${k}=${v}`),
    Healthcheck: {
      Test: spec.db.healthcheck,
      Interval: 5_000_000_000, // 5s, nanoseconds
      Timeout: 3_000_000_000,
      Retries: 10,
    },
    HostConfig: {
      NetworkMode: spec.networkName,
      NanoCpus: toNanoCpus(spec.db.limits.cpus),
      Memory: toBytes(spec.db.limits.memoryMb),
      Mounts: [
        { Type: "volume", Source: spec.db.volumeName, Target: "/var/lib/postgresql" },
      ],
    },
    NetworkingConfig: {
      EndpointsConfig: { [spec.networkName]: { Aliases: ["db"] } },
    },
  });
  await dbContainer.start();
  await waitForContainerHealthy(docker, dbContainer.id, dbReadyTimeoutMs);

  const appContainer = await docker.createContainer({
    Image: spec.app.image,
    name: `kairopro-app-${spec.projectId}`,
    Labels: spec.app.labels,
    Env: Object.entries(spec.app.environment).map(([k, v]) => `${k}=${v}`),
    ExposedPorts: { [`${spec.app.port}/tcp`]: {} },
    HostConfig: {
      NetworkMode: spec.networkName,
      NanoCpus: toNanoCpus(spec.app.limits.cpus),
      Memory: toBytes(spec.app.limits.memoryMb),
      PublishAllPorts: true,
      // No Binds, no Mounts from the host — code arrives via putArchive below.
    },
    NetworkingConfig: {
      EndpointsConfig: { [spec.networkName]: { Aliases: ["app"] } },
    },
  });

  await copyWorkspaceIntoContainer(appContainer, workspacePath);
  await appContainer.start();

  return { appContainerId: appContainer.id, dbContainerId: dbContainer.id };
}

/** Uploads `workspacePath`'s contents into the container at `/workspace`,
 * the one mechanism that gets code in without a host mount. Re-uploading
 * (e.g. before an `exec` after the agent edited files) overwrites matching
 * paths; it does not delete paths removed since the last upload. */
export async function copyWorkspaceIntoContainer(
  container: Docker.Container,
  workspacePath: string,
): Promise<void> {
  const pack = tar.pack(workspacePath);
  await container.putArchive(pack, { path: "/workspace" });
}

/** Stops both containers, preserving volumes and the network. */
export async function stopProject(
  docker: Docker,
  containers: ManagedContainers,
): Promise<void> {
  await stopIfRunning(docker, containers.appContainerId);
  await stopIfRunning(docker, containers.dbContainerId);
}

async function stopIfRunning(docker: Docker, containerId: string): Promise<void> {
  try {
    await docker.getContainer(containerId).stop();
  } catch (cause) {
    if (!isAlreadyStoppedOrMissing(cause)) throw cause;
  }
}

/** Removes both containers, the db volume, and the project network. */
export async function destroyProject(
  docker: Docker,
  spec: ComposeSpec,
  containers: ManagedContainers,
): Promise<void> {
  await removeIfExists(docker, containers.appContainerId);
  await removeIfExists(docker, containers.dbContainerId);
  await docker
    .getVolume(spec.db.volumeName)
    .remove()
    .catch(() => undefined);
  await removeProjectNetwork(docker, spec.projectId);
}

async function removeIfExists(docker: Docker, containerId: string): Promise<void> {
  try {
    await docker.getContainer(containerId).remove({ force: true });
  } catch (cause) {
    if (!isAlreadyStoppedOrMissing(cause)) throw cause;
  }
}

function isAlreadyStoppedOrMissing(cause: unknown): boolean {
  const statusCode = (cause as { statusCode?: number } | undefined)?.statusCode;
  return statusCode === 404 || statusCode === 304;
}

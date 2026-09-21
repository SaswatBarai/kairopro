#!/usr/bin/env tsx
/**
 * Manual/dev provisioning (Phase 14 / BE-9) — creates one project's real
 * containers (network, db, app) the same way `DockerRuntime.provision()`
 * does, without going through the API/DB. For poking at a project's
 * container by hand, or sanity-checking a new app image, outside a full
 * build run.
 *
 * Usage:
 *   pnpm provision-project <projectId> [--image=<image>] [--workspace=<hostPath>] [--port=<n>]
 *   pnpm provision-project <projectId> --yaml   # print docker-compose.yml instead of provisioning
 *   pnpm provision-project <projectId> --destroy
 *
 * `--yaml` uses `serializeComposeYaml` and never touches Docker or the
 * project's env — inspect the generated compose file without running
 * anything. It's the only place that serializer is used outside tests; the
 * real provisioning path below goes straight through dockerode instead, so
 * a project's decrypted env never lands in a file on disk.
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import Docker from "dockerode";
import {
  buildComposeSpec,
  serializeComposeYaml,
} from "../packages/core/src/modules/execution/docker/compose";
import {
  destroyProject,
  provisionProject,
} from "../packages/core/src/modules/execution/docker/manager";

const DEFAULT_IMAGE = "kairopro-app-runtime:local";

function parseArgs(argv: string[]) {
  const [projectId, ...rest] = argv;
  if (!projectId) {
    console.error(
      "Usage: pnpm provision-project <projectId> [--image=<image>] [--workspace=<hostPath>] [--port=<n>] [--yaml] [--destroy]",
    );
    process.exit(1);
  }

  const flags = new Map<string, string>();
  for (const arg of rest) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    flags.set(key, value ?? "true");
  }

  return {
    projectId,
    image: flags.get("image") ?? DEFAULT_IMAGE,
    workspace: flags.get("workspace"),
    port: flags.has("port") ? Number(flags.get("port")) : undefined,
    yamlOnly: flags.has("yaml"),
    destroy: flags.has("destroy"),
  };
}

async function main(): Promise<void> {
  const { projectId, image, workspace, port, yamlOnly, destroy } = parseArgs(
    process.argv.slice(2),
  );
  const spec = buildComposeSpec({ projectId, appImage: image, port });

  if (yamlOnly) {
    console.log(serializeComposeYaml(spec));
    return;
  }

  const docker = new Docker();
  await docker.ping().catch((cause) => {
    console.error("Could not reach the Docker daemon:", cause);
    process.exit(1);
  });

  if (destroy) {
    await destroyProject(docker, spec, {
      appContainerId: `kairopro-app-${projectId}`,
      dbContainerId: `kairopro-db-${projectId}`,
    });
    console.log(`Destroyed containers, volume, and network for ${projectId}`);
    return;
  }

  const workspacePath = workspace ?? (await ensureScratchWorkspace(projectId));
  console.log(
    `Provisioning ${projectId} (image: ${image}, workspace: ${workspacePath})...`,
  );

  const { appContainerId, dbContainerId } = await provisionProject(
    docker,
    spec,
    workspacePath,
  );

  console.log(`App container:      ${appContainerId}`);
  console.log(`Database container: ${dbContainerId}`);
  console.log(`Network:             ${spec.networkName}`);
  console.log(
    `\nExec into it:  docker exec -it ${appContainerId} sh` +
      `\nTear down:     pnpm provision-project ${projectId} --destroy`,
  );
}

/** A throwaway workspace with nothing but a placeholder file — enough to
 * exercise `putArchive`, when the caller didn't pass `--workspace` pointing
 * at a real project's files on disk. */
async function ensureScratchWorkspace(projectId: string): Promise<string> {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), `kairopro-provision-${projectId}-`),
  );
  await fs.writeFile(
    path.join(dir, "README.txt"),
    "Placeholder workspace from scripts/provision-project.ts — pass --workspace=<path> to use a real one.\n",
  );
  return dir;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

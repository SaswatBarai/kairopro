import { describe, expect, it, vi } from "vitest";
import { buildComposeSpec } from "./compose";
import { destroyProject, provisionProject, stopProject } from "./manager";

vi.mock("tar-fs", () => ({
  default: { pack: () => "fake-tar-stream" },
}));

/** A minimal fake Docker client — the plan explicitly allows a mocked
 * client for provision/stop/destroy, since exercising real container
 * creation is `docker.test.ts`'s job (against the real daemon). */
function fakeDocker() {
  const created: unknown[] = [];
  const containers = new Map<
    string,
    { id: string; started: boolean; stopped: boolean; removed: boolean; healthy: boolean }
  >();
  let nextId = 0;

  return {
    created,
    containers,
    listNetworks: vi.fn().mockResolvedValue([]),
    createNetwork: vi.fn().mockResolvedValue(undefined),
    getNetwork: vi.fn().mockReturnValue({ remove: vi.fn().mockResolvedValue(undefined) }),
    listImages: vi.fn().mockResolvedValue([{ id: "already-pulled" }]),
    createVolume: vi.fn().mockResolvedValue(undefined),
    getVolume: vi.fn().mockReturnValue({ remove: vi.fn().mockResolvedValue(undefined) }),
    createContainer: vi.fn(async (config: { name: string }) => {
      const id = `container-${nextId++}`;
      containers.set(id, { id, started: false, stopped: false, removed: false, healthy: true });
      created.push(config);
      return {
        id,
        start: vi.fn(async () => {
          containers.get(id)!.started = true;
        }),
        putArchive: vi.fn().mockResolvedValue(undefined),
      };
    }),
    getContainer: vi.fn((id: string) => ({
      inspect: vi.fn(async () => ({
        State: {
          Running: true,
          Health: { Status: containers.get(id)?.healthy ? "healthy" : "unhealthy" },
        },
      })),
      stop: vi.fn(async () => {
        const c = containers.get(id);
        if (c) c.stopped = true;
      }),
      remove: vi.fn(async () => {
        const c = containers.get(id);
        if (c) c.removed = true;
      }),
    })),
  };
}

describe("provisionProject (BE-9)", () => {
  it("creates the db container before the app container, and starts the db first", async () => {
    const docker = fakeDocker();
    const spec = buildComposeSpec({ projectId: "proj1", appImage: "kairopro-app-runtime:local" });

    const result = await provisionProject(docker as never, spec, "/workspace/proj1");

    expect(docker.created).toHaveLength(2);
    expect((docker.created[0] as { name: string }).name).toBe("kairopro-db-proj1");
    expect((docker.created[1] as { name: string }).name).toBe("kairopro-app-proj1");
    expect(docker.containers.get(result.dbContainerId)?.started).toBe(true);
    expect(docker.containers.get(result.appContainerId)?.started).toBe(true);
  });

  it("never sets a host bind mount on the app container", async () => {
    const docker = fakeDocker();
    const spec = buildComposeSpec({ projectId: "proj1", appImage: "img" });

    await provisionProject(docker as never, spec, "/workspace/proj1");

    const appConfig = docker.created[1] as { HostConfig: { Binds?: unknown; Mounts?: unknown } };
    expect(appConfig.HostConfig.Binds).toBeUndefined();
    // Only the db container gets a volume Mount; the app container gets none.
    expect(appConfig.HostConfig.Mounts).toBeUndefined();
  });

  it("always sets NanoCpus and Memory limits on both containers", async () => {
    const docker = fakeDocker();
    const spec = buildComposeSpec({ projectId: "proj1", appImage: "img" });

    await provisionProject(docker as never, spec, "/workspace/proj1");

    for (const config of docker.created as Array<{ HostConfig: { NanoCpus: number; Memory: number } }>) {
      expect(config.HostConfig.NanoCpus).toBeGreaterThan(0);
      expect(config.HostConfig.Memory).toBeGreaterThan(0);
    }
  });
});

describe("stopProject / destroyProject (BE-9)", () => {
  it("stopProject stops both containers without removing them", async () => {
    const docker = fakeDocker();
    await docker.createContainer({ name: "kairopro-app-proj1" });
    await docker.createContainer({ name: "kairopro-db-proj1" });
    const ids = [...docker.containers.keys()];
    const appId = ids[0]!;
    const dbId = ids[1]!;

    await stopProject(docker as never, { appContainerId: appId, dbContainerId: dbId });

    expect(docker.containers.get(appId)?.stopped).toBe(true);
    expect(docker.containers.get(dbId)?.stopped).toBe(true);
    expect(docker.containers.get(appId)?.removed).toBe(false);
  });

  it("destroyProject removes both containers, the volume, and the network", async () => {
    const docker = fakeDocker();
    await docker.createContainer({ name: "kairopro-app-proj1" });
    await docker.createContainer({ name: "kairopro-db-proj1" });
    const ids = [...docker.containers.keys()];
    const appId = ids[0]!;
    const dbId = ids[1]!;
    const spec = buildComposeSpec({ projectId: "proj1", appImage: "img" });

    await destroyProject(docker as never, spec, { appContainerId: appId, dbContainerId: dbId });

    expect(docker.containers.get(appId)?.removed).toBe(true);
    expect(docker.containers.get(dbId)?.removed).toBe(true);
    expect(docker.getVolume).toHaveBeenCalledWith(spec.db.volumeName);
  });

  it("stopProject does not throw if a container is already gone (404)", async () => {
    const docker = fakeDocker();
    docker.getContainer = vi.fn(() => ({
      stop: vi.fn().mockRejectedValue({ statusCode: 404 }),
      remove: vi.fn().mockRejectedValue({ statusCode: 404 }),
      inspect: vi.fn(),
    })) as never;

    await expect(
      stopProject(docker as never, { appContainerId: "gone", dbContainerId: "gone" }),
    ).resolves.toBeUndefined();
  });
});

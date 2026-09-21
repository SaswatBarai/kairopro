import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import Docker from "dockerode";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDockerRuntime } from "./docker";

/**
 * Runs `DockerRuntime` against a real local Docker daemon (available in this
 * environment — `kairopro-app-runtime:local` and `postgres:18-alpine` are
 * already pulled/built) rather than mocking dockerode, since this file is
 * exactly the seam where a mock would hide real Docker API behavior
 * (networking, healthchecks, `putArchive`) that `manager.test.ts` already
 * covers at the unit level with a fake client.
 *
 * Slow — provisions two real containers. Skipped automatically if the
 * daemon isn't reachable (e.g. CI without Docker) so the suite doesn't fail
 * outright in that environment.
 */
const projectId = `dockertest${Date.now()}`;
let workspaceRoot: string;

// Synchronous, at module-eval time — `describe.skipIf` reads this before
// any async setup (like `beforeAll`) has a chance to run.
const dockerAvailable = (() => {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

beforeAll(async () => {
  if (!dockerAvailable) return;
  workspaceRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "kairopro-docker-test-"),
  );
  process.env.KAIROPRO_WORKSPACE_ROOT = workspaceRoot;
  await fs.mkdir(path.join(workspaceRoot, projectId), { recursive: true });
  await fs.writeFile(
    path.join(workspaceRoot, projectId, "marker.txt"),
    "hello from the host workspace\n",
  );
}, 30_000);

afterAll(async () => {
  if (workspaceRoot)
    await fs.rm(workspaceRoot, { recursive: true, force: true });
}, 30_000);

describe.skipIf(!dockerAvailable)("DockerRuntime (BE-9, real Docker)", () => {
  let containerId: string;

  it("provisions app+db containers with no host mount, code arriving via putArchive", async () => {
    const runtime = createDockerRuntime();
    const provisioned = await runtime.provision({
      projectId,
      image: "kairopro-app-runtime:local",
    });

    containerId = provisioned.containerId;
    expect(containerId).toBeTruthy();

    const result = await runtime.exec({
      containerId,
      cmd: "cat /workspace/marker.txt",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("hello from the host workspace");
  }, 120_000);

  it("reports health once the app container is running", async () => {
    const runtime = createDockerRuntime();
    const health = await runtime.health(containerId);
    expect(health.ready).toBe(true);
  }, 15_000);

  it("execStream delivers output line by line and the final result matches", async () => {
    const runtime = createDockerRuntime();
    const lines: string[] = [];

    const result = await runtime.execStream(
      { containerId, cmd: "printf 'one\\ntwo\\nthree\\n'" },
      (line) => lines.push(line),
    );

    expect(lines).toEqual(["one", "two", "three"]);
    expect(result.stdout).toBe("one\ntwo\nthree\n");
    expect(result.exitCode).toBe(0);
  }, 30_000);

  it("exec resolves a host-workspace cwd to the container's /workspace", async () => {
    const runtime = createDockerRuntime();
    const hostRoot = path.join(workspaceRoot, projectId);

    const result = await runtime.exec({
      containerId,
      cmd: "pwd",
      cwd: hostRoot,
    });

    expect(result.stdout.trim()).toBe("/workspace");
  }, 30_000);

  it("reports a non-zero exit code for a failing command without throwing", async () => {
    const runtime = createDockerRuntime();
    const result = await runtime.exec({ containerId, cmd: "exit 7" });
    expect(result.exitCode).toBe(7);
  }, 30_000);

  it("destroy removes both containers and the project network", async () => {
    const runtime = createDockerRuntime();
    await runtime.destroy(containerId);

    const docker = new Docker();
    const remaining = await docker.listContainers({
      all: true,
      filters: { label: [`com.kairopro.project-id=${projectId}`] },
    });
    expect(remaining).toHaveLength(0);

    const networks = await docker.listNetworks({
      filters: { name: [`kairopro-net-${projectId}`] },
    });
    expect(networks).toHaveLength(0);
  }, 60_000);
});

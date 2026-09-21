import { PassThrough } from "node:stream";
import path from "node:path";
import Docker from "dockerode";
import { ProviderError, TimeoutError } from "../../lib/errors";
import {
  buildComposeSpec,
  PROJECT_LABEL,
  type ComposeSpec,
} from "../../modules/execution/docker/compose";
import { waitForContainerHealthy } from "../../modules/execution/docker/health";
import {
  copyWorkspaceIntoContainer,
  destroyProject,
  provisionProject,
  stopProject,
} from "../../modules/execution/docker/manager";
import { LineSplitter } from "../../modules/execution/terminal/stream";
import { getWorkspaceStore } from "../workspace";
import type {
  ContainerHealth,
  ContainerRuntime,
  ExecInput,
  ExecResult,
  ProvisionedContainer,
  ProvisionInput,
} from "./runtime";

/**
 * `DockerRuntime` — the real `ContainerRuntime` (Phase 14 / BE-9), replacing
 * `StubContainerRuntime`. Provisioning goes through `manager.ts` (raw
 * dockerode calls, never a shelled `docker compose` — decrypted credentials
 * in `ProvisionInput.env` never touch a file on disk this way).
 *
 * Neither container gets a host bind mount; code reaches the app container
 * only via `putArchive` (a tar upload). Because of that, `exec`/`execStream`
 * re-upload the project's current workspace before every call — an agent
 * tool edit lands on the host via `WorkspaceStore`, and the container needs
 * to see it before the next command runs.
 */
export function createDockerRuntime(
  docker: Docker = new Docker(),
): ContainerRuntime {
  const workspaceStore = getWorkspaceStore();

  async function projectIdOf(containerId: string): Promise<string | null> {
    try {
      const info = await docker.getContainer(containerId).inspect();
      return info.Config.Labels?.[PROJECT_LABEL] ?? null;
    } catch {
      return null;
    }
  }

  /** `ExecInput.cwd` is documented as "absolute inside the container", but
   * every call site today resolves it via `WorkspaceStore` (a host path) —
   * the same convention `StubContainerRuntime` uses, since it runs
   * unisolated on the host. This is the one place that difference is
   * reconciled: a host path under the project's workspace root maps to the
   * matching path under `/workspace` in the container; anything else
   * (already container-absolute, or unrelated) passes through unchanged. */
  async function resolveContainerCwd(
    projectId: string,
    requestedCwd: string | undefined,
  ): Promise<string> {
    if (!requestedCwd) return "/workspace";
    const hostRoot = await workspaceStore.resolve(projectId, ".");
    if (!requestedCwd.startsWith(hostRoot)) return requestedCwd;
    const rel = path.relative(hostRoot, requestedCwd);
    return rel && rel !== "."
      ? path.posix.join("/workspace", rel)
      : "/workspace";
  }

  async function runExec(
    input: ExecInput,
    onLine?: (line: string) => void,
  ): Promise<ExecResult> {
    const projectId = await projectIdOf(input.containerId);
    if (projectId) {
      const hostRoot = await workspaceStore.resolve(projectId, ".");
      await copyWorkspaceIntoContainer(
        docker.getContainer(input.containerId),
        hostRoot,
      );
    }
    const cwd = projectId
      ? await resolveContainerCwd(projectId, input.cwd)
      : (input.cwd ?? "/workspace");

    const container = docker.getContainer(input.containerId);
    const exec = await container.exec({
      Cmd: ["sh", "-lc", input.cmd],
      WorkingDir: cwd,
      Env: input.env
        ? Object.entries(input.env).map(([k, v]) => `${k}=${v}`)
        : undefined,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    let stdout = "";
    let stderr = "";
    const stdoutSplitter = onLine ? new LineSplitter(onLine) : undefined;
    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();
    stdoutStream.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdout += text;
      stdoutSplitter?.push(text);
    });
    stderrStream.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    docker.modem.demuxStream(stream, stdoutStream, stderrStream);

    return new Promise<ExecResult>((resolve, reject) => {
      let timedOut = false;
      const timer = input.timeoutMs
        ? setTimeout(() => {
            timedOut = true;
            // Best-effort: docker's API has no direct "cancel this exec";
            // kill the process it started, if we can learn its pid.
            exec
              .inspect()
              .then((info) => {
                const pid = (info as { Pid?: number }).Pid;
                if (pid) {
                  return container
                    .exec({ Cmd: ["kill", "-9", String(pid)] })
                    .then((killExec) => killExec.start({}));
                }
                return undefined;
              })
              .catch(() => undefined);
            reject(
              new TimeoutError({
                message: `Command timed out after ${input.timeoutMs}ms`,
                details: { cmd: input.cmd },
              }),
            );
          }, input.timeoutMs)
        : undefined;

      stream.on("error", (err) => {
        if (timer) clearTimeout(timer);
        if (!timedOut) reject(err);
      });
      stream.on("end", () => {
        if (timer) clearTimeout(timer);
        if (timedOut) return;
        stdoutSplitter?.flush();
        exec
          .inspect()
          .then((info) => {
            resolve({ exitCode: info.ExitCode ?? -1, stdout, stderr });
          })
          .catch(reject);
      });
    });
  }

  return {
    async provision(input: ProvisionInput): Promise<ProvisionedContainer> {
      const spec = buildComposeSpec({
        projectId: input.projectId,
        appImage: input.image,
        appEnv: input.env,
        port: input.port,
      });
      const hostRoot = await workspaceStore.resolve(input.projectId, ".");

      try {
        const { appContainerId } = await provisionProject(
          docker,
          spec,
          hostRoot,
        );
        const info = await docker.getContainer(appContainerId).inspect();
        const publishedPort =
          info.NetworkSettings.Ports?.[`${spec.app.port}/tcp`]?.[0]?.HostPort;
        const previewUrl = publishedPort
          ? `http://localhost:${publishedPort}`
          : "";
        return { containerId: appContainerId, previewUrl };
      } catch (cause) {
        throw new ProviderError({
          message: `Failed to provision containers for project ${input.projectId}`,
          cause,
        });
      }
    },

    exec: (input) => runExec(input),
    execStream: (input, onLine) => runExec(input, onLine),

    async health(containerId: string): Promise<ContainerHealth> {
      try {
        const info = await docker.getContainer(containerId).inspect();
        if (!info.State.Running) {
          return { ready: false, detail: info.State.Status };
        }
        const health = info.State.Health?.Status;
        if (health === undefined) return { ready: true };
        return { ready: health === "healthy", detail: health };
      } catch (cause) {
        return {
          ready: false,
          detail: cause instanceof Error ? cause.message : String(cause),
        };
      }
    },

    async stop(containerId: string): Promise<void> {
      const projectId = await projectIdOf(containerId);
      if (!projectId) {
        await docker
          .getContainer(containerId)
          .stop()
          .catch(() => undefined);
        return;
      }
      const dbContainerId = await findDbContainerId(docker, projectId);
      await stopProject(docker, {
        appContainerId: containerId,
        dbContainerId: dbContainerId ?? containerId,
      });
    },

    async destroy(containerId: string): Promise<void> {
      const projectId = await projectIdOf(containerId);
      if (!projectId) {
        await docker
          .getContainer(containerId)
          .remove({ force: true })
          .catch(() => undefined);
        return;
      }
      const dbContainerId = await findDbContainerId(docker, projectId);
      const spec = buildComposeSpec({ projectId, appImage: "" });
      await destroyProject(docker, spec, {
        appContainerId: containerId,
        dbContainerId: dbContainerId ?? containerId,
      });
    },
  };
}

async function findDbContainerId(
  docker: Docker,
  projectId: string,
): Promise<string | null> {
  try {
    const info = await docker
      .getContainer(`kairopro-db-${projectId}`)
      .inspect();
    return info.Id;
  } catch {
    return null;
  }
}

export { waitForContainerHealthy };
export type { ComposeSpec };

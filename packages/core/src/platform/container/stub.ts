import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { TimeoutError } from "../../lib/errors";
import type {
  ContainerHealth,
  ContainerRuntime,
  ExecInput,
  ExecResult,
  ManagedContainer,
  ProvisionInput,
} from "./runtime";

/**
 * StubContainerRuntime — runs commands ON THE HOST, no isolation.
 *
 * DEVELOPMENT AND TEST ONLY. This is the one place generated code could run
 * without isolation, so the factory refuses to construct in production and
 * every method re-checks. That is a security boundary, not a convenience.
 *
 * It exists so agent execution (Phase 9) and builds (Phase 15) are testable
 * before Docker lands (Phase 14) — at which point the selector in
 * `platform/container/index.ts` swaps this out and no consumer changes.
 */

function assertDevelopment(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "StubContainerRuntime must never run in production: it executes commands on the host without isolation. Select a real ContainerRuntime (Phase 14).",
    );
  }
}

/**
 * The environment a stubbed command runs with. The stub executes generated
 * code directly on the host, so inheriting `process.env` would hand it the
 * platform's own secrets — most dangerously `DATABASE_URL`: a generated
 * project's `prisma db push --accept-data-loss` would run against the
 * platform's database and drop its tables. So this is an allowlist of what
 * a command needs to run at all (a shell, node, npm, the network), and
 * anything else must be passed explicitly through `ExecInput.env`.
 */
const HOST_ENV_ALLOWLIST = [
  /^PATH$/,
  /^HOME$/,
  /^USER$/,
  /^LOGNAME$/,
  /^SHELL$/,
  /^TERM$/,
  /^TZ$/,
  /^TMPDIR$/,
  /^LANG$/,
  /^LC_/,
  /^NVM_/,
  /^(HTTPS?|NO|ALL)_PROXY$/i,
  /^npm_config_(registry|cache|proxy|https_proxy|strict_ssl|cafile)$/i,
];

export function hostEnvForCommands(
  source: Record<string, string | undefined> = process.env,
): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(source)) {
    if (HOST_ENV_ALLOWLIST.some((re) => re.test(key))) env[key] = value;
  }
  return env;
}

export function createStubContainerRuntime(): ContainerRuntime {
  assertDevelopment();

  // No real container exists to list, but jobs that sweep `list()` (Phase
  // 19's cleanup-inactive/cleanup-orphans) still need something to iterate
  // in dev/test — tracked here purely in memory, keyed by the fake id
  // `provision` hands back.
  const managed = new Map<string, string>(); // containerId -> projectId
  // Like a real container, the env given at provision time applies to every
  // command run in it — so callers set `DATABASE_URL` once, not per exec.
  const provisionedEnv = new Map<string, Record<string, string>>();

  async function run(
    input: ExecInput,
    onLine?: (line: string) => void,
  ): Promise<ExecResult> {
    assertDevelopment();

    const cwd =
      input.cwd ?? mkdtempSync(path.join(os.tmpdir(), "kairopro-stub-"));
    return new Promise<ExecResult>((resolve, reject) => {
      // detached: the command runs as its own process group, so a timeout
      // kill takes down its children too (an orphaned `sleep` would hold the
      // stdio pipes open and stall `close` forever otherwise).
      const child = spawn("sh", ["-lc", input.cmd], {
        cwd,
        // Cast: the host's own env type (augmented by Next in the web app to
        // require `NODE_ENV`) is stricter than what a child process needs.
        env: {
          ...hostEnvForCommands(),
          ...provisionedEnv.get(input.containerId),
          ...input.env,
        } as NodeJS.ProcessEnv,
        detached: true,
      });

      let stdout = "";
      let stderr = "";
      let pending = ""; // partial stdout line across chunk boundaries
      let timedOut = false;

      const timer =
        input.timeoutMs === undefined
          ? undefined
          : setTimeout(() => {
              timedOut = true;
              if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
            }, input.timeoutMs);

      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
        if (!onLine) return;
        pending += chunk;
        const lines = pending.split("\n");
        pending = lines.pop() ?? ""; // keep the partial tail
        for (const line of lines) onLine(line);
      });
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });

      child.on("error", (error) => {
        if (timer) clearTimeout(timer);
        reject(error);
      });
      child.on("close", (exitCode) => {
        if (timer) clearTimeout(timer);
        if (timedOut) {
          reject(
            new TimeoutError({
              message: `Command timed out after ${input.timeoutMs}ms`,
              details: { cmd: input.cmd, stdout, stderr },
            }),
          );
          return;
        }
        if (onLine && pending.length > 0) onLine(pending); // flush the last line
        resolve({ exitCode: exitCode ?? -1, stdout, stderr });
      });
    });
  }

  return {
    async provision(input: ProvisionInput) {
      assertDevelopment();
      // No container is created; the id is stable so callers can treat it
      // as opaque.
      const containerId = `stub-${input.projectId}`;
      managed.set(containerId, input.projectId);
      if (input.env) provisionedEnv.set(containerId, input.env);
      return { containerId, previewUrl: "" };
    },
    exec: (input) => run(input),
    execStream: (input, onLine) => run(input, onLine),
    async health(_containerId: string): Promise<ContainerHealth> {
      assertDevelopment();
      return { ready: true };
    },
    async stop(_containerId: string) {
      assertDevelopment();
    },
    async destroy(containerId: string) {
      assertDevelopment();
      managed.delete(containerId);
      provisionedEnv.delete(containerId);
    },
    async list(): Promise<ManagedContainer[]> {
      assertDevelopment();
      return [...managed.entries()].map(([containerId, projectId]) => ({
        containerId,
        projectId,
      }));
    },
  };
}

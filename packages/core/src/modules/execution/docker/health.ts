import type Docker from "dockerode";
import { TimeoutError } from "../../../lib/errors";

/**
 * Readiness and health probes (Phase 14 / BE-9). Two levels: a container's
 * own Docker healthcheck (used to gate the app container's start on the
 * database being ready), and an HTTP probe (used to report the app itself
 * as ready once its process is actually serving requests, not just
 * running).
 */

const DEFAULT_POLL_INTERVAL_MS = 500;

/** Polls `docker inspect`'s `State.Health.Status` until it reports
 * "healthy", or throws `TimeoutError`. A container with no healthcheck
 * configured is treated as healthy the moment it's running. */
export async function waitForContainerHealthy(
  docker: Docker,
  containerId: string,
  timeoutMs: number,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const info = await docker.getContainer(containerId).inspect();
    const health = info.State.Health?.Status;
    if (health === "healthy" || (health === undefined && info.State.Running)) {
      return;
    }
    if (health === "unhealthy") {
      // Keep polling until the deadline — a container can flap through
      // "unhealthy" during startup before settling; only a real timeout
      // should fail the caller.
    }
    await sleep(pollIntervalMs);
  }

  throw new TimeoutError({
    message: `Container ${containerId} did not become healthy within ${timeoutMs}ms`,
    details: { containerId },
  });
}

/** Polls a URL until it responds at all (any HTTP status — the caller
 * decides what "ready" means at the status-code level), or throws
 * `TimeoutError`. Network errors (connection refused during startup) are
 * swallowed and retried, not surfaced early. */
export async function waitForHttpReady(
  url: string,
  timeoutMs: number,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.status < 500) return;
    } catch {
      // Not up yet — keep polling.
    }
    await sleep(pollIntervalMs);
  }

  throw new TimeoutError({
    message: `${url} did not become ready within ${timeoutMs}ms`,
    details: { url },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

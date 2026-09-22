import { createDockerRuntime } from "./docker";
import type { ContainerRuntime } from "./runtime";
import { createStubContainerRuntime } from "./stub";

/**
 * The runtime selector — the single swap point. Production always gets the
 * real `DockerRuntime` (Phase 14) — the unisolated stub must never run
 * there. Development/test default to the stub (fast, no Docker daemon
 * required); set `KAIROPRO_USE_DOCKER=1` to exercise the real runtime
 * locally without changing `NODE_ENV`.
 *
 * Constructed lazily on first use so that merely importing `@kairopro/core`
 * never selects a runtime — the guard fires when execution is first
 * requested, which is what "fails startup if selected in production" means
 * for a library.
 */
let cached: ContainerRuntime | undefined;

export function getContainerRuntime(): ContainerRuntime {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.KAIROPRO_USE_DOCKER === "1"
  ) {
    cached ??= createDockerRuntime();
    return cached;
  }
  cached ??= createStubContainerRuntime();
  return cached;
}

export type {
  ContainerRuntime,
  ContainerHealth,
  ExecInput,
  ExecResult,
  ManagedContainer,
  ProvisionInput,
  ProvisionedContainer,
} from "./runtime";

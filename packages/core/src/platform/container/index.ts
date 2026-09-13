import type { ContainerRuntime } from "./runtime";
import { createStubContainerRuntime } from "./stub";

/**
 * The runtime selector — the single swap point. Today it returns the
 * development stub; Phase 14's DockerRuntime replaces it here and nothing
 * downstream changes.
 *
 * Constructed lazily on first use so that merely importing `@kairopro/core`
 * never selects a runtime — the guard fires when execution is first
 * requested, which is what "fails startup if selected in production" means
 * for a library.
 */
let cached: ContainerRuntime | undefined;

export function getContainerRuntime(): ContainerRuntime {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "No production ContainerRuntime is wired yet (Phase 14). The stub must never be selected in production.",
    );
  }
  cached ??= createStubContainerRuntime();
  return cached;
}

export type {
  ContainerRuntime,
  ContainerHealth,
  ExecInput,
  ExecResult,
  ProvisionInput,
  ProvisionedContainer,
} from "./runtime";

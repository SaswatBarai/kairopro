import path from "node:path";
import { LocalWorkspaceStore } from "./store";
import type { WorkspaceStore } from "./store";

/**
 * The workspace-store selector — the single seam consumers use. The root
 * comes from `KAIROPRO_WORKSPACE_ROOT`; in development it falls back to
 * `.workspaces` under the process cwd (pin it in .env to avoid per-cwd
 * scattering). In production it must be set explicitly.
 */
let cached: WorkspaceStore | undefined;

export function getWorkspaceStore(): WorkspaceStore {
  cached ??= new LocalWorkspaceStore(resolveRoot());
  return cached;
}

function resolveRoot(): string {
  const root = process.env.KAIROPRO_WORKSPACE_ROOT;
  if (root) return root;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "KAIROPRO_WORKSPACE_ROOT must be set in production — the workspace root cannot be inferred.",
    );
  }
  return path.join(process.cwd(), ".workspaces");
}

export type { WorkspaceStore } from "./store";

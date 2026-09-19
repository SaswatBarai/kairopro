import type { WorkspaceStore } from "../../../platform/workspace/store";

/**
 * Hydration (Phase 10 / AI-4): stage 2 of retrieval — full reads of only
 * the paths stage 1 selected. The file index never carries full contents,
 * so this is the one place a selected file's actual text gets read.
 */

export interface HydratedFile {
  path: string;
  contents: string;
}

export async function hydrate(
  workspace: WorkspaceStore,
  projectId: string,
  paths: string[],
): Promise<HydratedFile[]> {
  const files: HydratedFile[] = [];
  for (const path of paths) {
    try {
      const contents = await workspace.readFile(projectId, path);
      files.push({ path, contents });
    } catch {
      // Vanished between selection and hydration — drop it rather than
      // fail the whole retrieval over one file.
    }
  }
  return files;
}

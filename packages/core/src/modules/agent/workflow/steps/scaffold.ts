import { promises as fs } from "node:fs";
import { join, relative } from "node:path";
import {
  commitAll,
  initRepo,
  isWorkingTreeClean,
} from "../../../version/git.service";
import { resolveSkeletonDir } from "../../template";

/**
 * scaffold workflow step (Phase 16 / AI-6): copies a template's skeleton
 * into a project's workspace verbatim and commits it. The one place a
 * template's files reach a real project — everything downstream
 * (`freeze-contracts`, `generate-code`) only ever adds to what this wrote.
 */

const DEFAULT_TEMPLATE_ID = "nextjs-shadcn";

export interface ScaffoldInput {
  workspacePath: string;
  templateId?: string;
}

export interface ScaffoldResult {
  templateId: string;
  /** Workspace-relative paths copied from the skeleton, sorted. */
  filesCopied: string[];
  /** `null` when nothing changed — a re-run against an already-scaffolded
   * workspace is a no-op, not a duplicate commit. */
  commitHash: string | null;
}

async function listFilesRecursive(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else {
        out.push(relative(root, absolute).split("\\").join("/"));
      }
    }
  }
  await walk(root);
  return out.sort();
}

export async function scaffoldProject(
  input: ScaffoldInput,
): Promise<ScaffoldResult> {
  const templateId = input.templateId ?? DEFAULT_TEMPLATE_ID;
  const skeletonDir = resolveSkeletonDir(templateId);

  await initRepo(input.workspacePath); // idempotent — a no-op if already a repo
  await fs.cp(skeletonDir, input.workspacePath, {
    recursive: true,
    force: true,
  });
  const filesCopied = await listFilesRecursive(skeletonDir);

  if (await isWorkingTreeClean(input.workspacePath)) {
    // Already scaffolded with identical content — nothing to commit.
    return { templateId, filesCopied, commitHash: null };
  }

  const commitHash = await commitAll(
    input.workspacePath,
    `Scaffold ${templateId} template`,
  );
  return { templateId, filesCopied, commitHash };
}

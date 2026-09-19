import type { FileIndex } from "./file-index";

/**
 * Project summary (Phase 10 / AI-4): the always-included overview of what
 * the workspace contains — models, pages, routes — built from the file
 * index's tags, never from a model call. `conventions` stays empty until
 * `template.json` exists (Phase 16); this is where it plugs in.
 */

export interface ProjectSummary {
  fileCount: number;
  models: string[];
  pages: string[];
  routes: string[];
  conventions: string[];
}

export function summarize(index: FileIndex): ProjectSummary {
  const byTag = (tag: string) =>
    index
      .filter((entry) => entry.tags.includes(tag))
      .map((entry) => entry.path);

  return {
    fileCount: index.length,
    models: byTag("schema"),
    pages: byTag("page"),
    routes: byTag("route"),
    conventions: [],
  };
}

export function renderSummary(summary: ProjectSummary): string {
  const list = (label: string, paths: string[]) =>
    paths.length > 0
      ? `${label}: ${paths.join(", ")}`
      : `${label}: none detected`;

  return [
    `Project has ${summary.fileCount} indexed file(s).`,
    list("Models", summary.models),
    list("Pages", summary.pages),
    list("Routes", summary.routes),
  ].join("\n");
}

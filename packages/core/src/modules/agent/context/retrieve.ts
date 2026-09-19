import { logger } from "../../../platform/logger";
import type { WorkspaceStore } from "../../../platform/workspace/store";
import { estimateTokens } from "../llm/token-estimate";
import type { WorkflowPhase } from "../llm/router";
import { applyBudget, type BudgetCandidate } from "./budget";
import { buildDependencyGraph } from "./dependency-graph";
import { buildFileIndex, type FileIndexEntry } from "./file-index";
import { hydrate } from "./hydrate";
import { renderSummary, summarize } from "./summary";

/**
 * `retrieve()` — the single entry point for context (Phase 10 / AI-4). No
 * caller outside this module may build context; everything downstream
 * (prompts, tools) asks this for the file set instead of reading the
 * workspace itself. That is what lets the selection strategy change (this
 * is keyword matching over static metadata; a later version could be
 * vector search) without touching a single call site.
 *
 * Two stages: stage 1 selects candidate paths from the cheap file index
 * (`file-index.ts`) plus its dependency graph, never reading a file's full
 * contents to decide; stage 2 (`hydrate.ts`) reads only the files stage 1
 * chose. A hard token budget (`budget.ts`) is applied after hydration,
 * dropping the least-relevant selected files first.
 */

export interface RetrieveRequest {
  /** Free-text description of the task or change being made. */
  query: string;
  /** Paths the caller already knows are relevant — always included, and
   * never dropped by the `maxFiles` cap. */
  seedFiles?: string[];
}

export interface RetrieveProject {
  id: string;
  workspace: WorkspaceStore;
}

export type RetrievalReason = "seed" | "match" | "dependency";

export interface RetrievedFile {
  path: string;
  contents: string;
  reason: RetrievalReason;
}

export interface RetrieveResult {
  /** The project summary — always included, never subject to the budget
   * that governs individual files. */
  summary: string;
  files: RetrievedFile[];
  /** True when anything was dropped, for either budget or maxFiles reasons. */
  partial: boolean;
  /** Every path that was a candidate but didn't make the final set. */
  omitted: string[];
}

export interface RetrieveOptions {
  maxFiles?: number;
  maxTokens?: number;
}

const DEFAULT_MAX_FILES = 40;
const DEFAULT_MAX_TOKENS = 40_000;

/** Tags a phase especially cares about — used only as a small relevance
 * tiebreaker, never as the sole reason a file is selected. */
const PHASE_TAG_INTEREST: Partial<Record<WorkflowPhase, readonly string[]>> = {
  "data-model": ["schema"],
  "app-structure": ["route", "page"],
  design: ["component"],
  "code-gen": ["schema", "route", "component"],
  fix: ["schema", "route", "component", "test"],
};

const REASON_RANK: Record<RetrievalReason, number> = {
  seed: 0,
  match: 1,
  dependency: 2,
};

export async function retrieve(
  request: RetrieveRequest,
  project: RetrieveProject,
  phase: WorkflowPhase,
  options: RetrieveOptions = {},
): Promise<RetrieveResult> {
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

  const index = await buildFileIndex(project.workspace, project.id);
  const graph = buildDependencyGraph(index);
  const byPath = new Map(index.map((entry) => [entry.path, entry]));

  // Stage 1 — cheap, metadata-only selection.
  const reasons = new Map<string, RetrievalReason>();
  for (const path of request.seedFiles ?? []) {
    reasons.set(path, "seed");
  }

  const keywords = tokenizeQuery(request.query);
  for (const entry of index) {
    if (reasons.has(entry.path)) continue;
    if (matchesKeywords(entry, keywords)) reasons.set(entry.path, "match");
  }

  // Dependency expansion: anything that imports a seed/matched file is
  // pulled in too — this is what turns "the schema changed" into "and so
  // did the routes and forms that reference it."
  for (const path of [...reasons.keys()]) {
    for (const dependent of graph.dependents(path)) {
      if (!reasons.has(dependent)) reasons.set(dependent, "dependency");
    }
  }

  let selected = [...reasons.keys()].sort();
  let droppedByMaxFiles: string[] = [];

  if (selected.length > maxFiles) {
    const interest = PHASE_TAG_INTEREST[phase] ?? [];
    const ranked = [...selected].sort((a, b) => {
      const reasonDelta =
        REASON_RANK[reasons.get(a)!] - REASON_RANK[reasons.get(b)!];
      if (reasonDelta !== 0) return reasonDelta;
      const interestDelta =
        phaseInterestScore(b, byPath, interest) -
        phaseInterestScore(a, byPath, interest);
      if (interestDelta !== 0) return interestDelta;
      return a.localeCompare(b);
    });
    const kept = new Set(ranked.slice(0, maxFiles));
    droppedByMaxFiles = selected.filter((path) => !kept.has(path)).sort();
    selected = [...kept].sort();

    logger.warn(
      { phase, projectId: project.id, candidates: reasons.size, maxFiles },
      "context retrieval hit the maxFiles cap",
    );
  }

  // Stage 2 — full reads of only the selected files.
  const hydrated = await hydrate(project.workspace, project.id, selected);

  const interest = PHASE_TAG_INTEREST[phase] ?? [];
  const candidates: BudgetCandidate[] = hydrated.map((file) => ({
    path: file.path,
    contents: file.contents,
    relevance: relevanceOf(
      reasons.get(file.path)!,
      phaseInterestScore(file.path, byPath, interest),
    ),
  }));

  const summaryText = renderSummary(summarize(index));
  const budgetForFiles = Math.max(maxTokens - estimateTokens(summaryText), 0);
  const { kept, omitted: droppedByBudget } = applyBudget(
    candidates,
    budgetForFiles,
  );

  const files: RetrievedFile[] = kept.map((c) => ({
    path: c.path,
    contents: c.contents,
    reason: reasons.get(c.path)!,
  }));

  const omitted = [
    ...new Set([...droppedByMaxFiles, ...droppedByBudget]),
  ].sort();

  return {
    summary: summaryText,
    files,
    partial: omitted.length > 0,
    omitted,
  };
}

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}

/** Word-exact, not substring — "users.ts" must not match a "user" query
 * just because it contains the letters, or half the workspace would match
 * every request. Splitting on non-alphanumerics also means "UserForm"
 * stays one token and isn't accidentally split into "user" + "form". */
function matchesKeywords(entry: FileIndexEntry, keywords: string[]): boolean {
  if (keywords.length === 0) return false;
  const haystackWords = new Set(
    [entry.path, entry.purpose ?? "", ...entry.tags, ...entry.exports]
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
  return keywords.some((keyword) => haystackWords.has(keyword));
}

function phaseInterestScore(
  path: string,
  byPath: Map<string, FileIndexEntry>,
  interest: readonly string[],
): number {
  if (interest.length === 0) return 0;
  const tags = byPath.get(path)?.tags ?? [];
  return tags.some((tag) => interest.includes(tag)) ? 1 : 0;
}

function relevanceOf(reason: RetrievalReason, phaseBonus: number): number {
  const base = { seed: 3, match: 2, dependency: 1 }[reason];
  return base + phaseBonus;
}

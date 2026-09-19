import type { DiffSummary } from "@kairopro/contracts";
import type { RawDiffStat } from "./git.service";

/**
 * Derives the contract's simplified `DiffSummary` from a raw git diff stat
 * (Phase 13 / BE-8). Pure — no git, no I/O — so it's testable against a
 * fixed fixture independent of a real repository.
 */
export function summarizeDiff(stat: RawDiffStat): DiffSummary {
  return {
    filesChanged: stat.files.length,
    insertions: stat.insertions,
    deletions: stat.deletions,
  };
}

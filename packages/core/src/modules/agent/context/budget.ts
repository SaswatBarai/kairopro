import { estimateTokens } from "../llm/token-estimate";

/**
 * Token budgeting (Phase 10 / AI-4): a hard cap on how much file content
 * `retrieve()` can return, with files dropped by ascending relevance —
 * once the next-most-relevant candidate doesn't fit, everything after it
 * is omitted too, never skipped over in favor of a smaller, less relevant
 * one. That keeps "what got kept" a strict, predictable ranking rather
 * than a bin-packing puzzle.
 */

export interface BudgetCandidate {
  path: string;
  contents: string;
  /** Higher is more relevant; ties broken by path for determinism. */
  relevance: number;
}

export interface BudgetResult {
  kept: BudgetCandidate[];
  /** Paths dropped for size, sorted. */
  omitted: string[];
}

export function applyBudget(
  candidates: BudgetCandidate[],
  maxTokens: number,
): BudgetResult {
  const sorted = [...candidates].sort(
    (a, b) => b.relevance - a.relevance || a.path.localeCompare(b.path),
  );

  const kept: BudgetCandidate[] = [];
  const omitted: string[] = [];
  let used = 0;
  let full = false;

  for (const candidate of sorted) {
    if (full) {
      omitted.push(candidate.path);
      continue;
    }

    const tokens = estimateTokens(candidate.contents);
    // The single most relevant candidate is always kept, even oversized —
    // an empty context is worse than one that exceeds budget by itself.
    if (kept.length > 0 && used + tokens > maxTokens) {
      full = true;
      omitted.push(candidate.path);
      continue;
    }

    kept.push(candidate);
    used += tokens;
  }

  omitted.sort();
  return { kept, omitted };
}

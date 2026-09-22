import { estimateTokens } from "../llm/token-estimate";
import {
  listRecentSucceededChangeRequests,
  type ChangeRequestRow,
} from "../change/change.repository";

/**
 * Rolling summary of recent changes (Phase 20 / AI-9) — included in every
 * change-request plan so a long iteration session doesn't degrade into the
 * "stale context" failure mode the plan calls out: each new plan sees what
 * already changed, not just the current workspace snapshot.
 */

const RECENT_CANDIDATES = 20;
const DEFAULT_MAX_TOKENS = 1000;

const NO_PRIOR_CHANGES = "No prior changes.";

function summaryLine(row: ChangeRequestRow): string {
  const plan = row.plan as { summary?: string } | null;
  const text = plan?.summary ?? row.request;
  const hash = row.commitHash ? row.commitHash.slice(0, 7) : "?";
  return `- ${text} (${hash})`;
}

/**
 * Newest-first, budget-truncated: the most recent changes are always kept;
 * older ones are dropped first once `maxTokens` is reached — "reflects the
 * most recent" and "stays within its token budget" both fall out of the
 * same truncation order.
 */
export async function buildChangeSummary(
  projectId: string,
  maxTokens: number = DEFAULT_MAX_TOKENS,
): Promise<string> {
  const rows = await listRecentSucceededChangeRequests(
    projectId,
    RECENT_CANDIDATES,
  );
  if (rows.length === 0) return NO_PRIOR_CHANGES;

  const lines: string[] = [];
  let used = 0;
  for (const row of rows) {
    const line = summaryLine(row);
    const tokens = estimateTokens(line);
    if (used + tokens > maxTokens) break;
    lines.push(line);
    used += tokens;
  }

  return lines.length > 0 ? lines.join("\n") : NO_PRIOR_CHANGES;
}

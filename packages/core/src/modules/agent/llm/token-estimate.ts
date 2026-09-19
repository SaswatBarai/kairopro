/**
 * Pure token estimation — no dependency on the usage service or the
 * database, so the mock provider (Phase 7 / AI-1) can compute deterministic
 * usage numbers without pulling in a live-DB import chain.
 */

/** Rough estimate for text that has not gone through a provider call yet
 * (e.g. sizing a prompt before sending it, or the mock provider's
 * deterministic usage). Not exact — a real call's usage always comes from
 * the provider's own report; this is for budgeting and the mock only. */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

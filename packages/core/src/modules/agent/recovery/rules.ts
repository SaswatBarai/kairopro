/**
 * Degradation policy (Phase 17 / AI-7) — **the most important file in this
 * phase.** The product's promise is that the user always receives a
 * working app. That promise is correct for presentation and dangerous for
 * correctness: silently simplifying "only managers can approve" into
 * "anyone can approve" is a security hole shipped with a success message.
 *
 * This is data, not logic, on purpose — a reviewer reads the whole policy
 * in one screen, without tracing a function. `fix-loop.ts` is the only
 * code that reads this table; nothing here decides *how* to degrade, only
 * *whether* a given concern is ever allowed to.
 */

/** What a generated unit of work is actually about — the caller
 * (`phases/backend.ts`, `phases/frontend.ts`, …) tags each unit with the
 * concern it touches; this file never infers it from free text. Inferring
 * a security-relevant category from prose is exactly the kind of logic
 * this file exists to avoid. */
export const CONCERN_CATEGORIES = [
  "authorization",
  "tenant-isolation",
  "money-handling",
  "data-invariants",
  "audit-trail",
  "layout",
  "styling",
  "copy",
  "other",
] as const;

export type ConcernCategory = (typeof CONCERN_CATEGORIES)[number];

/** Every concern in this set never walks the degradation ladder — a
 * failure here halts the unit and records it as requiring attention,
 * regardless of how many attempts remain. Everything not listed here is
 * degradable by default (the ladder is the exception; permissiveness is
 * not the default we want for the five categories above it). */
export const NEVER_DEGRADABLE: ReadonlySet<ConcernCategory> = new Set([
  "authorization",
  "tenant-isolation",
  "money-handling",
  "data-invariants",
  "audit-trail",
]);

export function isDegradable(concern: ConcernCategory): boolean {
  return !NEVER_DEGRADABLE.has(concern);
}

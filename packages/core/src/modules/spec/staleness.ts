import type { SpecType } from "@kairopro/db";
import { findApprovedSpecsByTypes, updateSpecStatus } from "./spec.repository";

/**
 * Pipeline order the four spec types are generated in (Phase 11 workflow
 * steps: pm-questions → PRD → design → data-model → app-structure). A spec
 * approval only staleS types strictly downstream of it in this order.
 */
export const SPEC_ORDER: SpecType[] = [
  "PRD",
  "DESIGN",
  "DATA_MODEL",
  "APP_STRUCTURE",
];

/**
 * What is derived from each spec type — what goes stale when it changes.
 * Not simply "everything after it in the pipeline": the design system is
 * generated after the PRD but nothing is derived from it, so approving it
 * must not stale the data model or app structure (which, once stale, cannot
 * be re-approved without being regenerated).
 */
const DEPENDENTS: Record<SpecType, SpecType[]> = {
  PRD: ["DESIGN", "DATA_MODEL", "APP_STRUCTURE"],
  DESIGN: [],
  DATA_MODEL: ["APP_STRUCTURE"],
  APP_STRUCTURE: [],
};

export function downstreamTypes(type: SpecType): SpecType[] {
  return DEPENDENTS[type];
}

/**
 * Marks every currently-APPROVED spec of a downstream type STALE. Draft,
 * pending, rejected, or already-stale downstream specs are left alone —
 * only an approved spec can go stale, since only an approved spec is
 * something the build could actually be relying on.
 */
export async function staleDownstream(
  projectId: string,
  approvedType: SpecType,
): Promise<void> {
  const downstream = downstreamTypes(approvedType);
  const affected = await findApprovedSpecsByTypes(projectId, downstream);
  await Promise.all(affected.map((spec) => updateSpecStatus(spec.id, "STALE")));
}

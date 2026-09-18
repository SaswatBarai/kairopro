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

export function downstreamTypes(type: SpecType): SpecType[] {
  const index = SPEC_ORDER.indexOf(type);
  return SPEC_ORDER.slice(index + 1);
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

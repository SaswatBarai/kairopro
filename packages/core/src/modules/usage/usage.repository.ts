import { db } from "../../platform/db/client";
import type { UsageEvent as UsageEventRow } from "@kairopro/db";

/** Prisma queries only. Callers: usage.service (emit), billing later. */

export function recordUsage(data: {
  orgId: string;
  projectId?: string | null;
  buildId?: string | null;
  kind: "LLM_TOKENS" | "BUILD" | "CONTAINER_MINUTE";
  quantity: number;
}): Promise<UsageEventRow> {
  return db.usageEvent.create({
    data: {
      orgId: data.orgId,
      projectId: data.projectId ?? null,
      buildId: data.buildId ?? null,
      kind: data.kind,
      quantity: data.quantity,
    },
  });
}

export function listUsageByOrg(
  orgId: string,
  options?: { projectId?: string; since?: Date },
): Promise<UsageEventRow[]> {
  return db.usageEvent.findMany({
    where: {
      orgId,
      projectId: options?.projectId,
      createdAt: options?.since ? { gte: options.since } : undefined,
    },
    orderBy: { createdAt: "desc" },
  });
}

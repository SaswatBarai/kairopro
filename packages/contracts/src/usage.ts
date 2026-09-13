import { z } from "zod";

export const UsageKindSchema = z.enum([
  "LLM_TOKENS",
  "BUILD",
  "CONTAINER_MINUTE",
]);

export const UsageEventSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  projectId: z.string().nullable(),
  kind: UsageKindSchema,
  quantity: z.number().int().positive(),
  createdAt: z.iso.datetime(),
});

export const UsageEventListSchema = z.array(UsageEventSchema);

/** Period rollups the billing page's quota bars and totals consume. */
export const UsageTotalsSchema = z.object({
  llmTokens: z.number().int().nonnegative(),
  builds: z.number().int().nonnegative(),
  containerMinutes: z.number().int().nonnegative(),
});

export type UsageKind = z.infer<typeof UsageKindSchema>;
export type UsageEvent = z.infer<typeof UsageEventSchema>;
export type UsageEventList = z.infer<typeof UsageEventListSchema>;
export type UsageTotals = z.infer<typeof UsageTotalsSchema>;

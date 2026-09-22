import { z } from "zod";

/**
 * Change request contracts (Phase 20 / AI-9).
 */

export const ChangeRequestStatusSchema = z.enum([
  "PLANNING",
  "AWAITING_APPROVAL",
  "APPLYING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

export const ChangePlanTaskSchema = z.object({
  path: z.string().min(1),
  task: z.string().min(1),
});

export const ChangePlanSchema = z.object({
  summary: z.string().min(1),
  diffSummary: z.string().min(1),
  tasks: z.array(ChangePlanTaskSchema).min(1),
});

export const ChangeRequestSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  status: ChangeRequestStatusSchema,
  request: z.string(),
  plan: ChangePlanSchema.nullable(),
  commitHash: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const ChangeRequestListSchema = z.array(ChangeRequestSchema);

export const RequestChangeInputSchema = z.object({
  request: z.string().min(1).max(4000),
});

export type ChangeRequestStatus = z.infer<typeof ChangeRequestStatusSchema>;
export type ChangePlanTask = z.infer<typeof ChangePlanTaskSchema>;
export type ChangePlan = z.infer<typeof ChangePlanSchema>;
export type ChangeRequest = z.infer<typeof ChangeRequestSchema>;
export type ChangeRequestList = z.infer<typeof ChangeRequestListSchema>;
export type RequestChangeInput = z.infer<typeof RequestChangeInputSchema>;

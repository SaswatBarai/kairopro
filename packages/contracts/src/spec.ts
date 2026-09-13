import { z } from "zod";

export const SpecTypeSchema = z.enum([
  "PRD",
  "DESIGN",
  "DATA_MODEL",
  "APP_STRUCTURE",
]);

export const SpecStatusSchema = z.enum([
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "STALE",
]);

/**
 * Spec envelope. `content` is opaque JSON at the transport layer; the
 * per-type content schemas live in `agent/validators` and are shared with
 * BE-6 so a malformed spec never reaches the database.
 */
export const SpecSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  type: SpecTypeSchema,
  version: z.number().int().positive(),
  status: SpecStatusSchema,
  content: z.json(),
  createdAt: z.iso.datetime(),
});

export const SpecListSchema = z.array(SpecSchema);

/** PM-agent clarifying questions: exactly 3–5, each with 2–4 options. */
export const PmQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()).min(2).max(4),
});

export const PmQuestionsSchema = z.array(PmQuestionSchema).min(3).max(5);

export const AnswerPmQuestionsInputSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export type SpecType = z.infer<typeof SpecTypeSchema>;
export type SpecStatus = z.infer<typeof SpecStatusSchema>;
export type Spec = z.infer<typeof SpecSchema>;
export type SpecList = z.infer<typeof SpecListSchema>;
export type PmQuestion = z.infer<typeof PmQuestionSchema>;
export type PmQuestions = z.infer<typeof PmQuestionsSchema>;
export type AnswerPmQuestionsInput = z.infer<
  typeof AnswerPmQuestionsInputSchema
>;

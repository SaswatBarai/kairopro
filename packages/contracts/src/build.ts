import { z } from "zod";

export const BuildStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

export const BuildSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  status: BuildStatusSchema,
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  commitHash: z.string().nullable(),
  previewUrl: z.url().nullable(),
  createdAt: z.iso.datetime(),
});

export const BuildListSchema = z.array(BuildSchema);

export const BuildLogTypeSchema = z.enum([
  "STEP",
  "STDOUT",
  "STDERR",
  "EVENT",
  "CHECKPOINT",
]);

export const BuildLogSchema = z.object({
  id: z.string(),
  buildId: z.string(),
  /** Monotonic per build; SSE `Last-Event-ID` replays from it. */
  seq: z.number().int().nonnegative(),
  type: BuildLogTypeSchema,
  content: z.string(),
  createdAt: z.iso.datetime(),
});

export const BuildStreamEventNameSchema = z.enum([
  "status",
  "terminal",
  "code",
  "checkpoint",
  "done",
  "error",
]);

/** One SSE frame: persisted with `seq` before it is ever sent. */
export const BuildStreamEventSchema = z.object({
  seq: z.number().int().nonnegative(),
  event: BuildStreamEventNameSchema,
  data: z.json(),
});

export type BuildStatus = z.infer<typeof BuildStatusSchema>;
export type Build = z.infer<typeof BuildSchema>;
export type BuildList = z.infer<typeof BuildListSchema>;
export type BuildLogType = z.infer<typeof BuildLogTypeSchema>;
export type BuildLog = z.infer<typeof BuildLogSchema>;
export type BuildStreamEventName = z.infer<typeof BuildStreamEventNameSchema>;
export type BuildStreamEvent = z.infer<typeof BuildStreamEventSchema>;

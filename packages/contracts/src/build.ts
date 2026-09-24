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

/**
 * The `data` of a `code` event. Two families share the event name:
 *
 * - File stream — `{file, ...}`: what the Code Stream panel renders. `reset`
 *   marks the start of an attempt at that file (the first, and each repair —
 *   discard what was shown), `content` is text to append, `done` closes it
 *   (`omitted` = the unit was skipped and no file exists).
 * - Notices — `{unit, ...}`: a unit was simplified (`level`/`message`) or
 *   repaired (`repair`). These feed the "features were simplified" summary,
 *   never the code panel.
 */
export const BuildCodeEventDataSchema = z.union([
  z.object({ file: z.string(), reset: z.literal(true) }),
  z.object({ file: z.string(), content: z.string() }),
  z.object({ file: z.string(), done: z.literal(true), omitted: z.boolean() }),
  z.object({ unit: z.string(), level: z.string(), message: z.string() }),
  z.object({ unit: z.string(), repair: z.string() }),
]);

/** One SSE frame: persisted with `seq` before it is ever sent. */
export const BuildStreamEventSchema = z.object({
  seq: z.number().int().nonnegative(),
  event: BuildStreamEventNameSchema,
  data: z.json(),
});

export type BuildCodeEventData = z.infer<typeof BuildCodeEventDataSchema>;
export type BuildStatus = z.infer<typeof BuildStatusSchema>;
export type Build = z.infer<typeof BuildSchema>;
export type BuildList = z.infer<typeof BuildListSchema>;
export type BuildLogType = z.infer<typeof BuildLogTypeSchema>;
export type BuildLog = z.infer<typeof BuildLogSchema>;
export type BuildStreamEventName = z.infer<typeof BuildStreamEventNameSchema>;
export type BuildStreamEvent = z.infer<typeof BuildStreamEventSchema>;

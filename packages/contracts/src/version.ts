import { z } from "zod";

/** A checkpoint in a project workspace — a real git commit (G3 drawer). */
export const VersionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  hash: z.string(),
  message: z.string(),
  filesChanged: z.number().int().nonnegative(),
  revertible: z.boolean(),
  createdAt: z.iso.datetime(),
});

export const VersionListSchema = z.array(VersionSchema);

export const DiffSummarySchema = z.object({
  filesChanged: z.number().int().nonnegative(),
  insertions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
});

export type Version = z.infer<typeof VersionSchema>;
export type VersionList = z.infer<typeof VersionListSchema>;
export type DiffSummary = z.infer<typeof DiffSummarySchema>;

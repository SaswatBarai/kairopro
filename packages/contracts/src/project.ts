import { z } from "zod";

export const ProjectStatusSchema = z.enum([
  "DRAFT",
  "SPECIFYING",
  "BUILDING",
  "READY",
  "DEPLOYED",
]);

export const ProjectSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: ProjectStatusSchema,
  templateId: z.string(),
  previewUrl: z.url().nullable(),
  deployedUrl: z.url().nullable(),
  subdomain: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/**
 * What the dashboard card renders: a project plus the derived fields the
 * F2 design displays (stack label, latest commit, last activity).
 */
export const ProjectListItemSchema = ProjectSchema.extend({
  stack: z.string().nullable(),
  latestCommitHash: z.string().nullable(),
  lastActivityAt: z.iso.datetime(),
});

export const ProjectListSchema = z.array(ProjectListItemSchema);

export const CreateProjectInputSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(2000).optional(),
});

export const UpdateProjectInputSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(2000).nullable().optional(),
});

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectListItem = z.infer<typeof ProjectListItemSchema>;
export type ProjectList = z.infer<typeof ProjectListSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;

import { z } from "zod";

/**
 * Deploy + GitHub export contracts (Phase 19 / BE-11).
 */

export const DeployInputSchema = z.object({
  /** Required for a project's first deploy; ignored on a redeploy, which
   * reuses the subdomain already reserved. */
  subdomain: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export const DeployResultSchema = z.object({
  projectId: z.string(),
  subdomain: z.string(),
  deployedUrl: z.url(),
});

export type DeployInput = z.infer<typeof DeployInputSchema>;
export type DeployResult = z.infer<typeof DeployResultSchema>;

export const GithubConnectInputSchema = z.object({
  accessToken: z.string().min(1),
  githubLogin: z.string().min(1),
});

export const GithubConnectionStatusSchema = z.object({
  connected: z.boolean(),
  githubLogin: z.string().nullable(),
  repoUrl: z.url().nullable(),
});

export const GithubExportResultSchema = z.object({
  repoUrl: z.url(),
  defaultBranch: z.string(),
});

export type GithubConnectInput = z.infer<typeof GithubConnectInputSchema>;
export type GithubConnectionStatus = z.infer<
  typeof GithubConnectionStatusSchema
>;
export type GithubExportResult = z.infer<typeof GithubExportResultSchema>;

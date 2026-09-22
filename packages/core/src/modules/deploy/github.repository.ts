import type { Prisma } from "@kairopro/db";
import { db } from "../../platform/db/client";

/** DB access for a project's GitHub export connection — business rules live
 * in github.service. `secrets` is always `{ access_token: EncryptedRecord }`
 * — never plaintext. */
export type GithubConnectionRow = Prisma.GithubConnectionGetPayload<{}>;

export function findGithubConnection(
  projectId: string,
): Promise<GithubConnectionRow | null> {
  return db.githubConnection.findUnique({ where: { projectId } });
}

export function upsertGithubConnection(
  projectId: string,
  data: {
    githubLogin: string;
    secrets: Prisma.InputJsonValue;
    repoUrl?: string | null;
  },
): Promise<GithubConnectionRow> {
  return db.githubConnection.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });
}

export function setGithubConnectionRepoUrl(
  projectId: string,
  repoUrl: string,
): Promise<GithubConnectionRow> {
  return db.githubConnection.update({
    where: { projectId },
    data: { repoUrl },
  });
}

/** Idempotent — deleting a connection that doesn't exist is not an error. */
export async function deleteGithubConnection(projectId: string): Promise<void> {
  await db.githubConnection.deleteMany({ where: { projectId } });
}

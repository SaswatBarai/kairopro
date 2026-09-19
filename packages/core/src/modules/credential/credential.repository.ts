import type { CredentialService, Prisma } from "@kairopro/db";
import { db } from "../../platform/db/client";

/** DB access for project credentials — business rules live in the service.
 * `secrets` is always `{ [fieldKey]: EncryptedRecord }` — never plaintext. */
export type CredentialRow = Prisma.CredentialGetPayload<{}>;

export function findCredential(
  projectId: string,
  service: CredentialService,
): Promise<CredentialRow | null> {
  return db.credential.findUnique({
    where: { projectId_service: { projectId, service } },
  });
}

export function listCredentialsByProject(
  projectId: string,
): Promise<CredentialRow[]> {
  return db.credential.findMany({ where: { projectId } });
}

export function upsertCredentialSecrets(
  projectId: string,
  service: CredentialService,
  secrets: Prisma.InputJsonValue,
): Promise<CredentialRow> {
  return db.credential.upsert({
    where: { projectId_service: { projectId, service } },
    create: { projectId, service, secrets },
    update: { secrets },
  });
}

/** Idempotent — deleting a credential that doesn't exist is not an error. */
export async function deleteCredentialRow(
  projectId: string,
  service: CredentialService,
): Promise<void> {
  await db.credential.deleteMany({ where: { projectId, service } });
}

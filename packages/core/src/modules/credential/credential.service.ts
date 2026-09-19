import {
  SERVICE_REGISTRY,
  type CredentialService,
  type CredentialStatus,
  type PutCredentialInput,
  type ServiceCredentials,
  type ServiceCredentialsList,
  type ServiceDef,
} from "@kairopro/contracts";
import type { Prisma } from "@kairopro/db";
import type { RequestContext } from "../../lib/context";
import { NotFoundError, ValidationError } from "../../lib/errors";
import {
  decryptField,
  encryptField,
  getEncryptionKey,
  type EncryptedRecord,
} from "../../platform/crypto/encryption";
import { ownerOf } from "../org/access";
import {
  deleteCredentialRow,
  findCredential,
  listCredentialsByProject,
  upsertCredentialSecrets,
  type CredentialRow,
} from "./credential.repository";
import { injectCredentialsEnv } from "./inject";

/**
 * Credential domain service (Phase 12 / BE-7). Values are AES-256-GCM
 * encrypted at rest (`platform/crypto/encryption`, Phase 2) and never
 * appear as plaintext outside this file's function bodies — every return
 * value and every thrown error carries a masked value or none at all.
 */

const MASK_PREFIX = "••••••••";

/** Shows only the last four characters — the prefix is a fixed length
 * regardless of the real secret's length, so it never leaks how long the
 * secret actually is. */
function maskValue(value: string): string {
  return `${MASK_PREFIX}${value.slice(-4)}`;
}

async function requireProjectAccess(projectId: string, ctx: RequestContext) {
  const project = await ownerOf(projectId, ctx);
  if (!project) {
    throw new NotFoundError({ message: "Project not found" });
  }
  return project;
}

function requireServiceDef(service: CredentialService): ServiceDef {
  const def = SERVICE_REGISTRY.find((s) => s.id === service);
  if (!def) {
    throw new ValidationError({
      message: `Unknown credential service: ${service}`,
      details: { service },
    });
  }
  return def;
}

function toServiceCredentials(
  def: ServiceDef,
  row: CredentialRow | null,
  encryptionKey: Buffer,
): ServiceCredentials {
  const secrets =
    (row?.secrets as unknown as Record<string, EncryptedRecord>) ?? {};

  const fields = def.fields.map((field) => {
    const encrypted = secrets[field.key];
    const maskedValue = encrypted
      ? maskValue(decryptField(encrypted, encryptionKey))
      : "";
    return { key: field.key, label: field.label, maskedValue };
  });

  const configuredCount = def.fields.filter((f) => secrets[f.key]).length;
  const status: CredentialStatus =
    configuredCount === def.fields.length ? "CONNECTED" : "UNCONFIGURED";

  return { service: def.id, status, fields };
}

export async function listCredentials(
  projectId: string,
  ctx: RequestContext,
): Promise<ServiceCredentialsList> {
  await requireProjectAccess(projectId, ctx);
  const rows = await listCredentialsByProject(projectId);
  const byService = new Map(rows.map((row) => [row.service, row]));
  const encryptionKey = getEncryptionKey();

  return SERVICE_REGISTRY.map((def) =>
    toServiceCredentials(def, byService.get(def.id) ?? null, encryptionKey),
  );
}

export async function putCredential(
  projectId: string,
  input: PutCredentialInput,
  ctx: RequestContext,
): Promise<ServiceCredentials> {
  await requireProjectAccess(projectId, ctx);
  const def = requireServiceDef(input.service);

  const validKeys = new Set(def.fields.map((f) => f.key));
  for (const key of Object.keys(input.values)) {
    if (!validKeys.has(key)) {
      throw new ValidationError({
        message: `Unknown field "${key}" for service "${input.service}"`,
        details: { service: input.service, field: key },
      });
    }
  }

  const encryptionKey = getEncryptionKey();
  const existing = await findCredential(projectId, input.service);
  const secrets: Record<string, EncryptedRecord> = existing
    ? { ...(existing.secrets as unknown as Record<string, EncryptedRecord>) }
    : {};

  for (const [fieldKey, value] of Object.entries(input.values)) {
    secrets[fieldKey] = encryptField(value, encryptionKey);
  }

  const row = await upsertCredentialSecrets(
    projectId,
    input.service,
    secrets as unknown as Prisma.InputJsonValue,
  );
  await injectCredentialsEnv(projectId);
  return toServiceCredentials(def, row, encryptionKey);
}

export async function deleteCredential(
  projectId: string,
  service: CredentialService,
  ctx: RequestContext,
): Promise<void> {
  await requireProjectAccess(projectId, ctx);
  requireServiceDef(service);
  await deleteCredentialRow(projectId, service);
  await injectCredentialsEnv(projectId);
}

import { promises as fs } from "node:fs";
import { SERVICE_REGISTRY } from "@kairopro/contracts";
import {
  decryptField,
  getEncryptionKey,
  type EncryptedRecord,
} from "../../platform/crypto/encryption";
import { getWorkspaceStore } from "../../platform/workspace";
import { listCredentialsByProject } from "./credential.repository";

/**
 * Writes the project workspace's `.env` from its stored credentials
 * (Phase 12 / BE-7) — decrypted only in memory, never logged. Always
 * regenerates the whole file from the current DB state rather than
 * patching lines, so a delete "rewrites the .env without that key" by
 * construction: there is only one code path that produces this file.
 */
export async function injectCredentialsEnv(projectId: string): Promise<void> {
  const store = getWorkspaceStore();
  const rows = await listCredentialsByProject(projectId);
  const encryptionKey = getEncryptionKey();

  const lines: string[] = [];
  for (const row of rows) {
    const def = SERVICE_REGISTRY.find((service) => service.id === row.service);
    if (!def) continue; // an unknown/retired service in the DB — skip, don't write garbage

    const secrets = row.secrets as unknown as Record<string, EncryptedRecord>;
    for (const field of def.fields) {
      const encrypted = secrets[field.key];
      if (!encrypted) continue;
      const value = decryptField(encrypted, encryptionKey);
      lines.push(`${field.envKey}=${JSON.stringify(value)}`);
    }
  }

  const contents = lines.length > 0 ? `${lines.join("\n")}\n` : "";
  const envPath = await store.resolve(projectId, ".env");
  // `writeFile`'s `mode` option only takes effect when the file is created —
  // an existing `.env` (every write after the first) keeps its old mode
  // unless `chmod` is called explicitly, so the 0600 guarantee needs both.
  await fs.writeFile(envPath, contents, { mode: 0o600 });
  await fs.chmod(envPath, 0o600);
}

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ValidationError } from "../../lib/errors";

/**
 * AES-256-GCM field encryption — the credential seam (Phase 12). Each
 * encrypted value gets its own random IV; the auth tag is stored alongside
 * and verified on decrypt, so a tampered ciphertext fails loudly instead of
 * returning garbage.
 *
 * The record shape matches the Credential model's `secrets` JSON column:
 * `{ [fieldKey]: { iv, tag, data } }` — hex throughout.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;
const HEX = /^[0-9a-f]+$/i;

export interface EncryptedRecord {
  /** Per-record random IV, hex (24 chars). */
  iv: string;
  /** GCM auth tag, hex (32 chars). */
  tag: string;
  /** Ciphertext, hex. */
  data: string;
}

export const ENCRYPTION_KEY_ENV = "KAIROPRO_ENCRYPTION_KEY";

/** Generate a fresh 32-byte key, hex-encoded — for initial setup. */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_BYTES).toString("hex");
}

/** Parse and validate a hex key. 32 bytes = 64 hex chars. */
export function loadEncryptionKey(hex: string): Buffer {
  if (hex.length !== KEY_BYTES * 2 || !HEX.test(hex)) {
    throw new ValidationError({
      message: "Encryption key must be 64 hex characters (32 bytes)",
      details: { length: hex.length },
    });
  }
  return Buffer.from(hex, "hex");
}

/** The process key, from `KAIROPRO_ENCRYPTION_KEY`. Never hardcoded. */
export function getEncryptionKey(): Buffer {
  const hex = process.env[ENCRYPTION_KEY_ENV];
  if (!hex) {
    throw new ValidationError({
      message: `${ENCRYPTION_KEY_ENV} is not set — generate one with generateEncryptionKey()`,
    });
  }
  return loadEncryptionKey(hex);
}

function hexToBuffer(
  value: string,
  field: keyof EncryptedRecord,
  bytes?: number,
): Buffer {
  const lengthOk =
    bytes === undefined ? value.length % 2 === 0 : value.length === bytes * 2;
  if (!lengthOk || !HEX.test(value) || value.length === 0) {
    throw new ValidationError({
      message: `Malformed encrypted record: ${field}`,
      details: { field },
    });
  }
  return Buffer.from(value, "hex");
}

export function encryptField(plaintext: string, key: Buffer): EncryptedRecord {
  if (key.length !== KEY_BYTES) {
    throw new ValidationError({ message: "Encryption key must be 32 bytes" });
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const data = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    data: data.toString("hex"),
  };
}

export function decryptField(record: EncryptedRecord, key: Buffer): string {
  if (key.length !== KEY_BYTES) {
    throw new ValidationError({ message: "Encryption key must be 32 bytes" });
  }
  const iv = hexToBuffer(record.iv, "iv", IV_BYTES);
  const tag = hexToBuffer(record.tag, "tag", 16);
  const data = hexToBuffer(record.data, "data");

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    // Authentication failure — wrong key, tampered ciphertext, or tampered
    // tag. Fail loudly, never return garbage.
    throw new ValidationError({ message: "Failed to decrypt record" });
  }
}

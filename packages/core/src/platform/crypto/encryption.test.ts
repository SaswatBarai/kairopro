import { describe, expect, it } from "vitest";
import { generateEncryptionKey } from "./encryption";
import {
  decryptField,
  encryptField,
  getEncryptionKey,
  loadEncryptionKey,
  type EncryptedRecord,
} from "./encryption";

const key = Buffer.alloc(32, 7);

describe("crypto", () => {
  it("round-trips a plaintext", () => {
    const record = encryptField("sk_live_super_secret", key);
    expect(decryptField(record, key)).toBe("sk_live_super_secret");
  });

  it("produces distinct IVs on every call", () => {
    const a = encryptField("same plaintext", key);
    const b = encryptField("same plaintext", key);
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data); // GCM: same plaintext, different IV → different ciphertext
  });

  it("never embeds the plaintext in the record", () => {
    const record = encryptField("sk_live_super_secret", key);
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain("super_secret");
  });

  it("rejects a tampered ciphertext", () => {
    const record = encryptField("sk_live_super_secret", key);
    const tampered: EncryptedRecord = {
      ...record,
      data: (BigInt(`0x${record.data}`) ^ 1n)
        .toString(16)
        .padStart(record.data.length, "0"),
    };
    expect(() => decryptField(tampered, key)).toThrow(/Failed to decrypt/);
  });

  it("rejects a tampered auth tag", () => {
    const record = encryptField("sk_live_super_secret", key);
    const tampered: EncryptedRecord = {
      ...record,
      tag: (BigInt(`0x${record.tag}`) ^ 1n)
        .toString(16)
        .padStart(record.tag.length, "0"),
    };
    expect(() => decryptField(tampered, key)).toThrow(/Failed to decrypt/);
  });

  it("rejects the wrong key", () => {
    const record = encryptField("sk_live_super_secret", key);
    expect(() => decryptField(record, Buffer.alloc(32, 8))).toThrow(
      /Failed to decrypt/,
    );
  });

  it("rejects malformed records and keys", () => {
    const record = encryptField("x", key);
    expect(() => decryptField({ ...record, iv: "zz" }, key)).toThrow(
      /Malformed/,
    );
    expect(() => decryptField({ ...record, tag: "nothex" }, key)).toThrow(
      /Malformed/,
    );
    expect(() => decryptField({ ...record, data: "abc" }, key)).toThrow(
      /Malformed/,
    );
    expect(() => encryptField("x", Buffer.alloc(16))).toThrow(/32 bytes/);
    expect(() => loadEncryptionKey("tooshort")).toThrow(/64 hex/);
  });

  it("generates and loads a valid key; getEncryptionKey reads the env", () => {
    const generated = generateEncryptionKey();
    expect(generated).toMatch(/^[0-9a-f]{64}$/);
    expect(loadEncryptionKey(generated)).toHaveLength(32);

    const previous = process.env.KAIROPRO_ENCRYPTION_KEY;
    try {
      delete process.env.KAIROPRO_ENCRYPTION_KEY;
      expect(() => getEncryptionKey()).toThrow(/KAIROPRO_ENCRYPTION_KEY/);

      process.env.KAIROPRO_ENCRYPTION_KEY = generated;
      expect(getEncryptionKey().toString("hex")).toBe(generated);
    } finally {
      if (previous === undefined) delete process.env.KAIROPRO_ENCRYPTION_KEY;
      else process.env.KAIROPRO_ENCRYPTION_KEY = previous;
    }
  });
});

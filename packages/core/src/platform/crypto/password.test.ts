import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password crypto", () => {
  it("hashes password and verifies correctly", () => {
    const password = "SuperSecretPassword123!";
    const hash = hashPassword(password);

    expect(hash).toContain(":");
    expect(verifyPassword(password, hash)).toBe(true);
  });

  it("rejects invalid password", () => {
    const password = "SuperSecretPassword123!";
    const hash = hashPassword(password);

    expect(verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("produces distinct salts for identical passwords", () => {
    const password = "SamePassword";
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);

    expect(hash1).not.toBe(hash2);
    expect(verifyPassword(password, hash1)).toBe(true);
    expect(verifyPassword(password, hash2)).toBe(true);
  });
});

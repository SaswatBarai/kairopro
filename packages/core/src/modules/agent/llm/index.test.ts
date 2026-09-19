import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getLLMProvider } from "./index";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.TOGETHER_API_KEY;
  delete process.env.NODE_ENV;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("getLLMProvider selector (AI-1)", () => {
  it("returns the mock when no key is set and not in production", () => {
    const provider = getLLMProvider();
    expect(provider.name).toBe("mock");
  });

  it("returns the real Together provider when TOGETHER_API_KEY is set", () => {
    process.env.TOGETHER_API_KEY = "test-key";
    const provider = getLLMProvider();
    expect(provider.name).toBe("together");
  });

  it("throws in production when no key is configured", () => {
    process.env.NODE_ENV = "production";
    expect(() => getLLMProvider()).toThrow(/TOGETHER_API_KEY/);
  });

  it("uses the real provider in production when a key is configured", () => {
    process.env.NODE_ENV = "production";
    process.env.TOGETHER_API_KEY = "test-key";
    expect(() => getLLMProvider()).not.toThrow();
    expect(getLLMProvider().name).toBe("together");
  });
});

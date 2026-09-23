import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.TOGETHER_API_KEY;
  delete process.env.NODE_ENV;
  // The module caches its selected provider at module scope — reset the
  // module registry so each test gets a fresh, uncached selector.
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("getLLMProvider selector (AI-1)", () => {
  it("returns the mock when no key is set and not in production", async () => {
    const { getLLMProvider } = await import("./index");
    const provider = getLLMProvider();
    expect(provider.name).toBe("mock");
  });

  it("returns the real Anthropic provider when ANTHROPIC_API_KEY is set", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const { getLLMProvider } = await import("./index");
    const provider = getLLMProvider();
    expect(provider.name).toBe("anthropic");
  });

  it("prefers Anthropic over Together when both keys are set", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.TOGETHER_API_KEY = "test-key";
    const { getLLMProvider } = await import("./index");
    expect(getLLMProvider().name).toBe("anthropic");
  });

  it("returns the real Together provider when only TOGETHER_API_KEY is set", async () => {
    process.env.TOGETHER_API_KEY = "test-key";
    const { getLLMProvider } = await import("./index");
    const provider = getLLMProvider();
    expect(provider.name).toBe("together");
  });

  it("throws in production when no key is configured", async () => {
    process.env.NODE_ENV = "production";
    const { getLLMProvider } = await import("./index");
    expect(() => getLLMProvider()).toThrow(
      /ANTHROPIC_API_KEY.*TOGETHER_API_KEY/,
    );
  });

  it("uses the real provider in production when a key is configured", async () => {
    process.env.NODE_ENV = "production";
    process.env.ANTHROPIC_API_KEY = "test-key";
    const { getLLMProvider } = await import("./index");
    expect(() => getLLMProvider()).not.toThrow();
    expect(getLLMProvider().name).toBe("anthropic");
  });
});

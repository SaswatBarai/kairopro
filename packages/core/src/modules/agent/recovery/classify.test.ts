import { describe, expect, it } from "vitest";
import { classifyFailure, type FailureSignal } from "./classify";

describe("classifyFailure (AI-7)", () => {
  const cases: Array<{
    name: string;
    signal: FailureSignal;
    expected: string;
  }> = [
    {
      name: "a typecheck diagnostic",
      signal: { source: "typecheck", message: "TS2322: not assignable" },
      expected: "type",
    },
    {
      name: "an LLM provider failure",
      signal: { source: "llm", message: "rate limited" },
      expected: "provider",
    },
    {
      name: "a test run failure",
      signal: { source: "test", message: "1 failing" },
      expected: "test",
    },
    {
      name: "an exec failure that crashed the process",
      signal: {
        source: "exec",
        message: "FATAL ERROR: unhandled promise rejection",
        exitCode: 1,
      },
      expected: "runtime",
    },
    {
      name: "an exec failure whose port was already in use",
      signal: {
        source: "exec",
        message: "Error: listen EADDRINUSE: address already in use",
        exitCode: 1,
      },
      expected: "runtime",
    },
    {
      name: "an ordinary exec (build command) failure",
      signal: {
        source: "exec",
        message: "npm ERR! missing script: build",
        exitCode: 1,
      },
      expected: "build",
    },
  ];

  it.each(cases)("classifies $name as $expected", ({ signal, expected }) => {
    expect(classifyFailure(signal)).toBe(expected);
  });

  it("classifies an unrecognized source as unknown, not retried by the fix loop", () => {
    expect(classifyFailure({ source: "carrier-pigeon", message: "lost" })).toBe(
      "unknown",
    );
  });

  it("is pure — the same signal always classifies the same way", () => {
    const signal: FailureSignal = { source: "typecheck", message: "x" };
    expect(classifyFailure(signal)).toBe(classifyFailure(signal));
  });
});

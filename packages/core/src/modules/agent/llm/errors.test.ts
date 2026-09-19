import { describe, expect, it } from "vitest";
import {
  AppError,
  ProviderError,
  TimeoutError,
  ValidationError,
} from "../../../lib/errors";
import {
  LLMProviderError,
  LLMStructuredOutputError,
  LLMTimeoutError,
} from "./errors";

describe("LLM errors (AI-1)", () => {
  it("LLMProviderError is a ProviderError carrying the provider name", () => {
    const error = new LLMProviderError({ provider: "mock", message: "boom" });
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error.status).toBe(502);
    expect(error.code).toBe("PROVIDER_ERROR");
    expect(error.provider).toBe("mock");
  });

  it("LLMStructuredOutputError is a ValidationError carrying the attempt count", () => {
    const error = new LLMStructuredOutputError({
      attempts: 3,
      message: "boom",
    });
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.status).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.attempts).toBe(3);
  });

  it("LLMTimeoutError is a TimeoutError carrying the provider name", () => {
    const error = new LLMTimeoutError({ provider: "mock", message: "boom" });
    expect(error).toBeInstanceOf(TimeoutError);
    expect(error.status).toBe(504);
    expect(error.code).toBe("TIMEOUT_ERROR");
    expect(error.provider).toBe("mock");
  });
});

import { describe, expect, it } from "vitest";
import {
  AppError,
  ConflictError,
  NotFoundError,
  ProviderError,
  TimeoutError,
  ValidationError,
} from "./errors";

describe("errors", () => {
  it("each type maps to its intended status and contract code", () => {
    const cases = [
      [NotFoundError, 404, "NOT_FOUND"],
      [ValidationError, 400, "VALIDATION_ERROR"],
      [ConflictError, 409, "CONFLICT"],
      [ProviderError, 502, "PROVIDER_ERROR"],
      [TimeoutError, 504, "TIMEOUT_ERROR"],
    ] as const;

    for (const [ErrorType, status, code] of cases) {
      const error = new ErrorType({ message: "boom" });
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
      expect(error.status).toBe(status);
      expect(error.code).toBe(code);
      expect(error.name).toBe(ErrorType.name);
      expect(error.message).toBe("boom");
    }
  });

  it("carries internal details and a cause without exposing them in toJSON", () => {
    const cause = new Error("prisma P2002");
    const error = new ConflictError({
      message: "A project with that name already exists",
      details: { table: "Project", constraint: "Project_orgId_name_key" },
      cause,
    });

    expect(error.details).toEqual({
      table: "Project",
      constraint: "Project_orgId_name_key",
    });
    expect(error.cause).toBe(cause);
    expect(error.toJSON()).toEqual({
      error: {
        code: "CONFLICT",
        message: "A project with that name already exists",
      },
    });
  });
});

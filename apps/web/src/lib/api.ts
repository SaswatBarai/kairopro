import { NextResponse } from "next/server";
import { AppError, RateLimitedError, logger } from "@kairopro/core";

/**
 * The single place an AppError becomes an HTTP response in the projects API.
 * Typed errors return their own status and user-safe body; anything else is
 * a 500 with no internal detail leaked.
 */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof RateLimitedError) {
    const retryAfterSeconds =
      (err.details as { retryAfterSeconds?: number } | undefined)
        ?.retryAfterSeconds ?? 60;
    return NextResponse.json(err.toJSON(), {
      status: err.status,
      headers: { "Retry-After": String(retryAfterSeconds) },
    });
  }
  if (err instanceof AppError) {
    return NextResponse.json(err.toJSON(), { status: err.status });
  }
  logger.error({ err }, "Unhandled API error");
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
      },
    },
    { status: 500 },
  );
}

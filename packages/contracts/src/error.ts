import { z } from "zod";

/**
 * Error envelope. Every route failure returns this shape. `message` is
 * user-safe copy — never a stack trace, a Prisma error, or container output.
 * Internal detail is logged server-side, never returned.
 */
export const ErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "CONFLICT",
  "PROVIDER_ERROR",
  "TIMEOUT_ERROR",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);

export const ErrorBodySchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
  }),
});

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type ErrorBody = z.infer<typeof ErrorBodySchema>;

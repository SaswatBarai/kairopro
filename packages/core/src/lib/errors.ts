import type { ErrorCode } from "@kairopro/contracts";

/**
 * Typed errors. Every module throws one of these; the route boundary
 * (apps/web) is the only place they become HTTP responses — status and
 * user-safe code travel with the error, nothing else does.
 *
 * `message` must already be user-safe: no stack traces, no Prisma messages,
 * no container output. Internal detail goes in `details` and is logged
 * server-side, never serialized to a client.
 */
export interface AppErrorOptions {
  message: string;
  /** Internal context for logs — never returned to a client. */
  details?: unknown;
  cause?: unknown;
}

export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly status: number;
  readonly details?: unknown;

  constructor({ message, details, cause }: AppErrorOptions) {
    super(message, { cause });
    this.name = new.target.name;
    this.details = details;
  }

  toJSON(): { error: { code: ErrorCode; message: string } } {
    return { error: { code: this.code, message: this.message } };
  }
}

/** The caller asked for something that does not exist — or that they must not
 * know exists (cross-tenant access failures return this, never a 403). */
export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND" as const;
  readonly status = 404;
}

/** Malformed or invalid input. Also used for confinement and crypto
 * integrity failures — inputs that fail structural validation. */
export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR" as const;
  readonly status = 400;
}

/** The request conflicts with existing state — duplicate email, second active
 * build, illegal status transition. */
export class ConflictError extends AppError {
  readonly code = "CONFLICT" as const;
  readonly status = 409;
}

/** An external provider (LLM, Docker, Stripe, mail) failed or returned
 * something unusable. */
export class ProviderError extends AppError {
  readonly code = "PROVIDER_ERROR" as const;
  readonly status = 502;
}

/** An operation exceeded its deadline — a command timeout, a health probe
 * that never went ready. */
export class TimeoutError extends AppError {
  readonly code = "TIMEOUT_ERROR" as const;
  readonly status = 504;
}

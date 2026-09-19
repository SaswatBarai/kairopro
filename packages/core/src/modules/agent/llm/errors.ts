import {
  ProviderError,
  TimeoutError,
  ValidationError,
} from "../../../lib/errors";

/**
 * LLM-specific typed errors (Phase 7 / AI-1). Each extends the base
 * `lib/errors` class that fixes its HTTP status and contract code, so a
 * route boundary that only knows about `AppError` still handles these
 * correctly — the subclasses just carry provider-specific detail for logs.
 */

/** The provider call itself failed — network, auth, rate limit, 5xx. */
export class LLMProviderError extends ProviderError {
  readonly provider: string;

  constructor(opts: {
    provider: string;
    message: string;
    details?: unknown;
    cause?: unknown;
  }) {
    super({ message: opts.message, details: opts.details, cause: opts.cause });
    this.provider = opts.provider;
  }
}

/** A structured call exhausted its retries without a schema-valid response. */
export class LLMStructuredOutputError extends ValidationError {
  readonly attempts: number;

  constructor(opts: {
    attempts: number;
    message: string;
    details?: unknown;
    cause?: unknown;
  }) {
    super({ message: opts.message, details: opts.details, cause: opts.cause });
    this.attempts = opts.attempts;
  }
}

/** A provider call exceeded its deadline. */
export class LLMTimeoutError extends TimeoutError {
  readonly provider: string;

  constructor(opts: { provider: string; message: string; details?: unknown }) {
    super({ message: opts.message, details: opts.details });
    this.provider = opts.provider;
  }
}

import pino, { type DestinationStream, type Logger as PinoLogger } from "pino";

/**
 * Pino with correlation fields. Every log line is structured JSON; when a
 * call site knows which project/build/step it is acting on, it binds those
 * fields once via `withCorrelation` and every child line carries them.
 */

export type Logger = PinoLogger;

/** The correlation triple that threads through build and agent logs. */
export interface CorrelationFields {
  projectId?: string;
  buildId?: string;
  step?: string;
}

export interface CreateLoggerOptions {
  name?: string;
  level?: string;
  /** Test seam: capture JSON lines instead of writing to stdout. */
  stream?: DestinationStream;
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const { name, level, stream } = options;
  return pino(
    { level: level ?? process.env.LOG_LEVEL ?? "info", name },
    stream,
  );
}

/**
 * Bind correlation fields to a logger. Only the provided fields are bound —
 * a line from a project-only context never shows a stale `buildId`.
 */
export function withCorrelation(
  logger: Logger,
  fields: CorrelationFields,
): Logger {
  const bound: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) bound[key] = value;
  }
  return Object.keys(bound).length > 0 ? logger.child(bound) : logger;
}

/** The process root logger. */
export const logger: Logger = createLogger();

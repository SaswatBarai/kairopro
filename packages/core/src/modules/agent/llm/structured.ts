import { z } from "zod";
import type { RequestContext } from "../../../lib/context";
import { logger, withCorrelation } from "../../../platform/logger";
import { LLMStructuredOutputError } from "./errors";
import type { LLMCompleteInput, LLMMessage, LLMProvider } from "./provider";
import { recordCallUsage } from "./tokens";

/** Total attempts, including the first — two retries after an initial miss. */
const MAX_ATTEMPTS = 3;

export interface CompleteStructuredInput<T> {
  provider: LLMProvider;
  model: string;
  schema: z.ZodType<T>;
  messages: LLMMessage[];
  ctx: RequestContext;
  maxTokens?: number;
  temperature?: number;
  refs?: { projectId?: string | null; buildId?: string | null };
}

/**
 * Wraps `LLMProvider.complete` with schema-validated JSON output and
 * bounded retry (Phase 7 / AI-1 exit criteria): the schema is embedded in
 * the prompt as JSON Schema; a parse or validation failure is fed back to
 * the model as a corrective turn, up to `MAX_ATTEMPTS` total attempts, then
 * throws `LLMStructuredOutputError`.
 */
export async function completeStructured<T>(
  input: CompleteStructuredInput<T>,
): Promise<T> {
  const log = withCorrelation(logger, {
    projectId: input.refs?.projectId ?? undefined,
    buildId: input.refs?.buildId ?? undefined,
  });

  const jsonSchema = z.toJSONSchema(input.schema);
  const baseMessages: LLMMessage[] = [
    {
      role: "system",
      content: [
        "Respond with ONLY valid JSON matching this JSON Schema. No prose, no markdown code fences.",
        `<json-schema>${JSON.stringify(jsonSchema)}</json-schema>`,
      ].join("\n"),
    },
    ...input.messages,
  ];

  let correction: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const messages = correction
      ? [
          ...baseMessages,
          {
            role: "user" as const,
            content: `The previous response failed schema validation:\n${correction}\nReturn corrected JSON only.`,
          },
        ]
      : baseMessages;

    const completeInput: LLMCompleteInput = {
      model: input.model,
      messages,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
    };

    const result = await input.provider.complete(completeInput);
    await recordCallUsage(result.usage, input.ctx, input.refs);

    const parsed = parseJson(result.content);
    if (parsed.ok) {
      const validated = input.schema.safeParse(parsed.value);
      if (validated.success) return validated.data;
      correction = JSON.stringify(validated.error.flatten());
    } else {
      correction = parsed.error;
    }

    log.warn(
      { attempt, maxAttempts: MAX_ATTEMPTS, error: correction },
      "structured LLM response failed validation",
    );
  }

  throw new LLMStructuredOutputError({
    attempts: MAX_ATTEMPTS,
    message: "Structured LLM response failed schema validation after retries",
    details: { lastError: correction },
  });
}

function parseJson(
  text: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  let cleaned = text.trim();

  // Strip markdown code block wrappers if present (e.g., ```json ... ``` or ``` ...)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  // Find the boundaries of the JSON payload if wrapped in extraneous prose/text
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  let start = -1;
  let end = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = lastBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = lastBracket;
  }

  if (start !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  try {
    return { ok: true, value: JSON.parse(cleaned) };
  } catch (cause) {
    return {
      ok: false,
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

/**
 * Strips a markdown code fence that wraps an *entire* response — Claude
 * reliably does this (```yaml around a DESIGN.md, ```prisma around a
 * schema) even when the prompt says not to, and the validators downstream
 * parse formats that are position-sensitive: YAML frontmatter has to start
 * on line 1, Prisma DSL has to start with a keyword.
 *
 * Deliberately conservative — it only unwraps when the opening line is a
 * bare fence (optionally language-tagged) and the very last characters
 * close it. A document that merely *contains* fenced code blocks, which a
 * DESIGN.md legitimately can, is returned untouched.
 */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) return trimmed;

  const firstNewline = trimmed.indexOf("\n");
  if (firstNewline === -1) return trimmed;

  const openingLine = trimmed.slice(0, firstNewline).trim();
  if (!/^```[a-zA-Z0-9_-]*$/.test(openingLine)) return trimmed;

  return trimmed.slice(firstNewline + 1, -3).trim();
}

export interface CompleteWithValidatorInput<T> {
  provider: LLMProvider;
  model: string;
  messages: LLMMessage[];
  ctx: RequestContext;
  maxTokens?: number;
  temperature?: number;
  refs?: { projectId?: string | null; buildId?: string | null };
  /** Validates and transforms the raw completion text. Throw (sync or
   * async) to reject the attempt and trigger a retry — the thrown
   * message is fed back to the model as a corrective turn. */
  validate: (content: string) => T | Promise<T>;
}

/**
 * Same bounded-retry shape as `completeStructured`, for outputs that
 * aren't JSON — a `DESIGN.md` document, a Prisma schema — where the real
 * validation is domain-specific (parses as the target format) rather than
 * "matches a JSON Schema". `completeStructured` can't express that, so
 * this takes an arbitrary validator instead of a Zod schema.
 */
export async function completeWithValidator<T>(
  input: CompleteWithValidatorInput<T>,
): Promise<T> {
  const log = withCorrelation(logger, {
    projectId: input.refs?.projectId ?? undefined,
    buildId: input.refs?.buildId ?? undefined,
  });

  let correction: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const messages = correction
      ? [
          ...input.messages,
          {
            role: "user" as const,
            content: `The previous response was invalid:\n${correction}\nReturn a corrected response.`,
          },
        ]
      : input.messages;

    const completeInput: LLMCompleteInput = {
      model: input.model,
      messages,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
    };

    const result = await input.provider.complete(completeInput);
    await recordCallUsage(result.usage, input.ctx, input.refs);

    try {
      return await input.validate(stripCodeFence(result.content));
    } catch (cause) {
      correction = cause instanceof Error ? cause.message : String(cause);
    }

    log.warn(
      { attempt, maxAttempts: MAX_ATTEMPTS, error: correction },
      "text completion failed validation",
    );
  }

  throw new LLMStructuredOutputError({
    attempts: MAX_ATTEMPTS,
    message: "Text completion failed validation after retries",
    details: { lastError: correction },
  });
}

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
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (cause) {
    return {
      ok: false,
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

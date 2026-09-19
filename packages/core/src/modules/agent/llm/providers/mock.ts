import { estimateTokens } from "../token-estimate";
import type {
  LLMCompleteInput,
  LLMCompleteResult,
  LLMMessage,
  LLMProvider,
  LLMStreamEvent,
} from "../provider";

/**
 * MockProvider — deterministic, offline (Phase 7 / AI-1). This is what
 * makes the whole AI-track test suite runnable without a network call or a
 * live API key.
 *
 * `structured.ts` embeds the requested JSON Schema in a `<json-schema>`
 * tag; this provider extracts it and fabricates the smallest value that
 * satisfies it. Any other call gets a fixed canned reply — good enough for
 * exercising the provider interface itself (streaming, usage reporting).
 */
export const MockProvider: LLMProvider = {
  name: "mock",

  async complete(input: LLMCompleteInput): Promise<LLMCompleteResult> {
    return respond(input.messages);
  },

  async stream(
    input: LLMCompleteInput,
    onEvent: (event: LLMStreamEvent) => void,
  ): Promise<LLMCompleteResult> {
    const result = respond(input.messages);
    for (const word of result.content.split(/(?<=\s)/)) {
      onEvent({ delta: word });
    }
    return result;
  },
};

function respond(messages: LLMMessage[]): LLMCompleteResult {
  const content = buildContent(messages);
  return {
    content,
    usage: {
      inputTokens: estimateTokens(messages.map((m) => m.content).join("\n")),
      outputTokens: estimateTokens(content),
    },
    stopReason: "end_turn",
  };
}

const SCHEMA_TAG = /<json-schema>([\s\S]*?)<\/json-schema>/;

function buildContent(messages: LLMMessage[]): string {
  for (const message of messages) {
    const match = message.content.match(SCHEMA_TAG);
    if (match?.[1]) {
      const schema = JSON.parse(match[1]) as JsonSchema;
      return JSON.stringify(fabricate(schema, schema));
    }
  }
  return "mock response";
}

/** The subset of JSON Schema `z.toJSONSchema` emits for the shapes this
 * codebase's agent schemas use — object/array/string/number/boolean/enum,
 * `$ref` into `$defs`, and `anyOf`. Not a general-purpose implementation. */
interface JsonSchema {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  minItems?: number;
  anyOf?: JsonSchema[];
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  definitions?: Record<string, JsonSchema>;
}

function resolveRef(ref: string, root: JsonSchema): JsonSchema {
  const path = ref.replace(/^#\//, "").split("/");
  let node: unknown = root;
  for (const key of path) {
    node = (node as Record<string, unknown> | undefined)?.[key];
  }
  return (node as JsonSchema | undefined) ?? {};
}

function fabricate(schema: JsonSchema, root: JsonSchema): unknown {
  if (schema.$ref) return fabricate(resolveRef(schema.$ref, root), root);
  if (schema.const !== undefined) return schema.const;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.anyOf?.[0]) return fabricate(schema.anyOf[0], root);

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  switch (type) {
    case "object": {
      const out: Record<string, unknown> = {};
      const props = schema.properties ?? {};
      const required = schema.required ?? Object.keys(props);
      for (const key of required) {
        if (props[key]) out[key] = fabricate(props[key], root);
      }
      return out;
    }
    case "array": {
      if (!schema.items) return [];
      // Respect `minItems` (e.g. "exactly 3-5 questions") — a naive
      // single-element array would fail that bound on every attempt,
      // exhausting retries against a schema the mock can never satisfy.
      const count = Math.max(schema.minItems ?? 1, 1);
      return Array.from({ length: count }, () =>
        fabricate(schema.items as JsonSchema, root),
      );
    }
    case "string":
      return "mock-string";
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return false;
    case "null":
      return null;
    default:
      return null;
  }
}

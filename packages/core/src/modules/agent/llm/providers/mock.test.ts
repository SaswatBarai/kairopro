import { z } from "zod";
import { describe, expect, it } from "vitest";
import { MockProvider } from "./mock";

describe("MockProvider (AI-1)", () => {
  it("returns a canned reply for a plain (non-structured) call", async () => {
    const result = await MockProvider.complete({
      model: "any-model",
      messages: [{ role: "user", content: "hello" }],
    });

    expect(result.content).toBe("mock response");
    expect(result.stopReason).toBe("end_turn");
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.usage.outputTokens).toBeGreaterThan(0);
  });

  it("fabricates a value that satisfies an embedded JSON Schema", async () => {
    const schema = z.object({
      title: z.string(),
      count: z.number().int(),
      done: z.boolean(),
      tag: z.enum(["a", "b"]),
      items: z.array(z.string()),
    });
    const jsonSchema = z.toJSONSchema(schema);

    const result = await MockProvider.complete({
      model: "any-model",
      messages: [
        {
          role: "system",
          content: `<json-schema>${JSON.stringify(jsonSchema)}</json-schema>`,
        },
      ],
    });

    const parsed = schema.parse(JSON.parse(result.content));
    expect(parsed.tag).toBe("a");
  });

  it("fabricates required nested objects", async () => {
    const schema = z.object({
      user: z.object({ id: z.string(), age: z.number() }),
    });
    const jsonSchema = z.toJSONSchema(schema);

    const result = await MockProvider.complete({
      model: "any-model",
      messages: [
        {
          role: "system",
          content: `<json-schema>${JSON.stringify(jsonSchema)}</json-schema>`,
        },
      ],
    });

    expect(() => schema.parse(JSON.parse(result.content))).not.toThrow();
  });

  it("streams the same content complete() would return, in chunks", async () => {
    const chunks: string[] = [];
    const result = await MockProvider.stream(
      { model: "any-model", messages: [{ role: "user", content: "hi" }] },
      (event) => chunks.push(event.delta),
    );

    expect(chunks.join("")).toBe(result.content);
    expect(chunks.length).toBeGreaterThan(0);
  });
});

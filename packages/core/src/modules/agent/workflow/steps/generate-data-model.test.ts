import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../../lib/context";
import { LLMStructuredOutputError } from "../../llm/errors";
import type { LLMCompleteResult, LLMProvider } from "../../llm/provider";
import { generateDataModel } from "./generate-data-model";

vi.mock("../../../usage/usage.service", () => ({ emit: vi.fn() }));

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };

function result(content: string): LLMCompleteResult {
  return {
    content,
    usage: { inputTokens: 1, outputTokens: 1 },
    stopReason: "end_turn",
  };
}

function providerReturning(...contents: string[]): LLMProvider {
  const complete = vi.fn();
  for (const c of contents) complete.mockResolvedValueOnce(result(c));
  return { name: "fake", complete, stream: vi.fn() };
}

const VALID_SCHEMA = `model User {
  id    String @id @default(cuid())
  name  String
  posts Post[]
}

model Post {
  id     String @id @default(cuid())
  title  String
  userId String
  user   User @relation(fields: [userId], references: [id])
}
`;

const INVALID_SCHEMA = `model User {
  id String @id
  broken this is not prisma syntax at all
}
`;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateDataModel (AI-5)", () => {
  it("returns a schema that parses as valid Prisma", async () => {
    const provider = providerReturning(VALID_SCHEMA);

    const schema = await generateDataModel({
      prd: "# Overview\nA blog.",
      ctx,
      provider,
    });

    expect(schema).toContain("model User");
    expect(schema).toContain("model Post");
  }, 15_000);

  it("rejects a schema that fails to parse and retries", async () => {
    const provider = providerReturning(INVALID_SCHEMA, VALID_SCHEMA);

    const schema = await generateDataModel({
      prd: "# Overview\nA blog.",
      ctx,
      provider,
    });

    expect(schema).toBe(VALID_SCHEMA.trim());
    expect(provider.complete).toHaveBeenCalledTimes(2);
  }, 15_000);

  it("exhausts retries and throws when the schema never parses", async () => {
    const provider = providerReturning(
      INVALID_SCHEMA,
      INVALID_SCHEMA,
      INVALID_SCHEMA,
    );

    await expect(
      generateDataModel({ prd: "# Overview\nA blog.", ctx, provider }),
    ).rejects.toThrow(LLMStructuredOutputError);
  }, 15_000);
});

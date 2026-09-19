import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { UsageTotalsSchema } from "@kairopro/contracts";
import type { LLMProvider } from "@kairopro/core";
import { resetDb, testDb } from "./helpers";

/**
 * Integration Gate I-1 (AI-1, AI-3 ↔ BE-1, BE-2, BE-4): "the agent can call
 * a model, record usage, and write files it is given." This file proves the
 * two checklist items that need a real database — the other three
 * (fixtures render deterministically, no prompt leaks a stack convention,
 * the stub container refuses production) are unit-tested in
 * `packages/core` and are not duplicated here.
 */

const core = await import("@kairopro/core");
const prisma = testDb();

beforeEach(async () => {
  await resetDb(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

let seedCounter = 0;
async function seedOrg() {
  const email = `ada-${++seedCounter}@lovelace.dev`;
  const user = await prisma.user.create({
    data: { name: "Ada Lovelace", email },
  });
  const org = await prisma.organization.create({
    data: {
      name: "kairo-core",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  return { ctx: { userId: user.id, orgId: org.id } };
}

describe("agent LLM provider (Gate I-1, real DB)", () => {
  it("a structured call through the mock provider records a real UsageEvent", async () => {
    const { ctx } = await seedOrg();

    const result = await core.completeStructured({
      provider: core.MockProvider,
      model: "mock-model",
      schema: UsageTotalsSchema,
      messages: [{ role: "user", content: "report current usage totals" }],
      ctx,
    });

    expect(UsageTotalsSchema.parse(result)).toEqual(result);

    const events = await prisma.usageEvent.findMany({
      where: { orgId: ctx.orgId },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("LLM_TOKENS");
    expect(events[0]!.quantity).toBeGreaterThan(0);
  });

  it("a schema-violating response retries and then fails cleanly, recording usage on every attempt", async () => {
    const { ctx } = await seedOrg();

    const alwaysInvalid: LLMProvider = {
      name: "always-invalid",
      complete: async () => ({
        content: "not valid json",
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "end_turn" as const,
      }),
      stream: async () => {
        throw new Error("not used");
      },
    };

    await expect(
      core.completeStructured({
        provider: alwaysInvalid,
        model: "mock-model",
        schema: UsageTotalsSchema,
        messages: [{ role: "user", content: "report current usage totals" }],
        ctx,
      }),
    ).rejects.toThrow(core.LLMStructuredOutputError);

    const events = await prisma.usageEvent.findMany({
      where: { orgId: ctx.orgId },
    });
    // Every attempt (all three, since it never succeeds) reports usage.
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.kind === "LLM_TOKENS")).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../lib/context";
import { estimateTokens, recordCallUsage } from "./tokens";

vi.mock("../../usage/usage.service", () => ({
  emit: vi.fn(),
}));

import { emit } from "../../usage/usage.service";

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tokens (AI-1)", () => {
  it("estimateTokens is deterministic and never zero for non-empty text", () => {
    expect(estimateTokens("")).toBeGreaterThan(0);
    expect(estimateTokens("hello world")).toBe(estimateTokens("hello world"));
  });

  it("recordCallUsage reports total tokens on success", async () => {
    await recordCallUsage({ inputTokens: 100, outputTokens: 50 }, ctx, {
      projectId: "prj-1",
    });

    expect(emit).toHaveBeenCalledWith("LLM_TOKENS", 150, ctx, {
      projectId: "prj-1",
    });
  });

  it("skips emission when usage is zero", async () => {
    await recordCallUsage({ inputTokens: 0, outputTokens: 0 }, ctx);
    expect(emit).not.toHaveBeenCalled();
  });
});

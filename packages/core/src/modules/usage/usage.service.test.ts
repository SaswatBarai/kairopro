import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../lib/context";
import { ValidationError } from "../../lib/errors";
import { emit } from "./usage.service";

vi.mock("./usage.repository", () => ({
  recordUsage: vi.fn(),
}));

const childLogger = { error: vi.fn() };

type MockLogger = {
  child: (fields: Record<string, string>) => typeof childLogger;
};

vi.mock("../../platform/logger", () => ({
  logger: { child: vi.fn(() => childLogger) },
  withCorrelation: (log: MockLogger, fields: Record<string, string>) =>
    Object.keys(fields).length > 0 ? log.child(fields) : log,
  createLogger: vi.fn(),
}));

import { recordUsage } from "./usage.repository";

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usage.service emit (BE-4)", () => {
  it("writes a UsageEvent row for a valid emission", async () => {
    await emit("LLM_TOKENS", 12400, ctx, { projectId: "prj-1" });

    expect(recordUsage).toHaveBeenCalledWith({
      orgId: "org-1",
      projectId: "prj-1",
      buildId: null,
      kind: "LLM_TOKENS",
      quantity: 12400,
    });
  });

  it("rejects an invalid kind", async () => {
    await expect(emit("NOT_A_KIND" as never, 1, ctx)).rejects.toThrow(
      ValidationError,
    );
    expect(recordUsage).not.toHaveBeenCalled();
  });

  it("rejects zero, negative, and fractional quantities", async () => {
    for (const quantity of [0, -5, 1.5]) {
      await expect(emit("BUILD", quantity, ctx)).rejects.toThrow(
        ValidationError,
      );
    }
    expect(recordUsage).not.toHaveBeenCalled();
  });

  it("never throws into the caller's path when the repository fails — it logs and swallows", async () => {
    vi.mocked(recordUsage).mockRejectedValueOnce(
      new Error("connection refused"),
    );

    // The one sanctioned swallow: a successful LLM call or build must not
    // fail because a billing row could not be written.
    await expect(
      emit("LLM_TOKENS", 100, ctx, { projectId: "prj-1" }),
    ).resolves.toBeUndefined();

    expect(childLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "LLM_TOKENS", quantity: 100 }),
      "usage.emit failed; event dropped",
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../platform/db/client", () => ({ db: {} }));
vi.mock("../change/change.repository", () => ({
  listRecentSucceededChangeRequests: vi.fn(),
}));

import { listRecentSucceededChangeRequests } from "../change/change.repository";
import { buildChangeSummary } from "./change-summary";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "cr-1",
    projectId: "p-1",
    status: "SUCCEEDED",
    request: "add urgent flag",
    plan: { summary: "Add an urgent flag to tasks" },
    commitHash: "abc1234def",
    startedAt: new Date(),
    finishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildChangeSummary (AI-9)", () => {
  it("reports no prior changes when there are none", async () => {
    vi.mocked(listRecentSucceededChangeRequests).mockResolvedValue([]);
    expect(await buildChangeSummary("p-1")).toBe("No prior changes.");
  });

  it("lists each change's summary and short commit hash, newest first", async () => {
    vi.mocked(listRecentSucceededChangeRequests).mockResolvedValue([
      row({
        plan: { summary: "Most recent change" },
        commitHash: "1111111abc",
      }),
      row({ plan: { summary: "Older change" }, commitHash: "2222222abc" }),
    ] as never);

    const summary = await buildChangeSummary("p-1");

    expect(summary).toBe(
      "- Most recent change (1111111)\n- Older change (2222222)",
    );
  });

  it("falls back to the raw request text when a row has no plan summary", async () => {
    vi.mocked(listRecentSucceededChangeRequests).mockResolvedValue([
      row({ plan: null, request: "raw request text" }),
    ] as never);

    expect(await buildChangeSummary("p-1")).toBe(
      "- raw request text (abc1234)",
    );
  });

  it("keeps the most recent entries and drops older ones once the token budget is exceeded", async () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row({
        plan: { summary: `change number ${i} with some extra padding text` },
        commitHash: `commit${i}0000000`,
      }),
    );
    vi.mocked(listRecentSucceededChangeRequests).mockResolvedValue(
      rows as never,
    );

    const summary = await buildChangeSummary("p-1", 20);
    const lines = summary.split("\n");

    expect(lines.length).toBeLessThan(rows.length);
    expect(lines[0]).toContain("change number 0");
  });
});

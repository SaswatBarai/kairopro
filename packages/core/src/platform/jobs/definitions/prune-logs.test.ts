import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../modules/build/build.repository", () => ({
  pruneBuildLogsOlderThan: vi.fn(),
}));

import { pruneBuildLogsOlderThan } from "../../../modules/build/build.repository";
import { LOG_RETENTION_MS, runPruneLogs } from "./prune-logs";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runPruneLogs (BE-11)", () => {
  it("deletes only rows past retention, passing the correct cutoff", async () => {
    vi.mocked(pruneBuildLogsOlderThan).mockResolvedValue(7);
    const now = 100_000_000;

    const result = await runPruneLogs(LOG_RETENTION_MS, () => now);

    expect(result.deleted).toBe(7);
    expect(pruneBuildLogsOlderThan).toHaveBeenCalledWith(
      new Date(now - LOG_RETENTION_MS),
    );
  });
});

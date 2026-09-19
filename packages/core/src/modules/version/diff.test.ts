import { describe, expect, it } from "vitest";
import type { RawDiffStat } from "./git.service";
import { summarizeDiff } from "./diff";

describe("summarizeDiff (BE-8)", () => {
  it("matches a known fixture — file count and line counts", () => {
    const stat: RawDiffStat = {
      files: [
        { file: "a.ts", insertions: 3, deletions: 1 },
        { file: "b.ts", insertions: 0, deletions: 5 },
      ],
      insertions: 3,
      deletions: 6,
    };

    expect(summarizeDiff(stat)).toEqual({
      filesChanged: 2,
      insertions: 3,
      deletions: 6,
    });
  });

  it("reports zero for an empty diff", () => {
    expect(summarizeDiff({ files: [], insertions: 0, deletions: 0 })).toEqual({
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
    });
  });
});

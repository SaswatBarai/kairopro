import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@kairopro/core";

vi.mock("@/lib/request-context", () => ({
  getRequestContext: vi.fn().mockResolvedValue({
    userId: "user-1",
    orgId: "org-1",
  }),
}));

vi.mock("@kairopro/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@kairopro/core")>();
  return { ...original, getVersionDiff: vi.fn() };
});

import { getVersionDiff } from "@kairopro/core";
import { GET } from "./route";

const routeContext = {
  params: Promise.resolve({ id: "prj-1", versionId: "ver-1" }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/projects/[id]/versions/[versionId]/diff", () => {
  it("returns just the summary by default", async () => {
    vi.mocked(getVersionDiff).mockResolvedValueOnce({
      summary: { filesChanged: 2, insertions: 5, deletions: 1 },
      raw: "diff --git a/a.ts b/a.ts\n",
    });

    const res = await GET(new Request("http://x/diff"), routeContext);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      summary: { filesChanged: 2, insertions: 5, deletions: 1 },
    });
  });

  it("includes the raw diff when ?raw=1", async () => {
    vi.mocked(getVersionDiff).mockResolvedValueOnce({
      summary: { filesChanged: 2, insertions: 5, deletions: 1 },
      raw: "diff --git a/a.ts b/a.ts\n",
    });

    const res = await GET(new Request("http://x/diff?raw=1"), routeContext);

    const json = await res.json();
    expect(json.raw).toBe("diff --git a/a.ts b/a.ts\n");
  });

  it("returns 404 for an unknown version", async () => {
    vi.mocked(getVersionDiff).mockRejectedValueOnce(
      new NotFoundError({ message: "Version not found" }),
    );

    const res = await GET(new Request("http://x/diff"), routeContext);
    expect(res.status).toBe(404);
  });
});

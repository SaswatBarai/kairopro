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
  return { ...original, listVersions: vi.fn() };
});

import { listVersions } from "@kairopro/core";
import { GET } from "./route";

const routeContext = { params: Promise.resolve({ id: "prj-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/projects/[id]/versions", () => {
  it("returns history newest-first", async () => {
    const versions = [
      { id: "ver-2", hash: "bbb2222", message: "Approve DESIGN v1" },
      { id: "ver-1", hash: "aaa1111", message: "Initial project" },
    ];
    vi.mocked(listVersions).mockResolvedValueOnce(versions as never);

    const res = await GET(new Request("http://x"), routeContext);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(versions);
    expect(listVersions).toHaveBeenCalledWith("prj-1", {
      userId: "user-1",
      orgId: "org-1",
    });
  });

  it("returns 404 for a foreign project", async () => {
    vi.mocked(listVersions).mockRejectedValueOnce(
      new NotFoundError({ message: "Project not found" }),
    );

    const res = await GET(new Request("http://x"), routeContext);
    expect(res.status).toBe(404);
  });
});

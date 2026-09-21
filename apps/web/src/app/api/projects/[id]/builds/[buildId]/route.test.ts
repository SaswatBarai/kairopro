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
  return { ...original, getBuild: vi.fn() };
});

import { getBuild } from "@kairopro/core";
import { GET } from "./route";

const routeContext = {
  params: Promise.resolve({ id: "prj-1", buildId: "build-1" }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/projects/[id]/builds/[buildId]", () => {
  it("returns the build's current status", async () => {
    vi.mocked(getBuild).mockResolvedValueOnce({
      id: "build-1",
      status: "RUNNING",
    } as never);

    const res = await GET(new Request("http://x"), routeContext);

    expect(res.status).toBe(200);
    expect(getBuild).toHaveBeenCalledWith("build-1", {
      userId: "user-1",
      orgId: "org-1",
    });
    expect((await res.json()).status).toBe("RUNNING");
  });

  it("returns 404 for a build outside the caller's org", async () => {
    vi.mocked(getBuild).mockRejectedValueOnce(
      new NotFoundError({ message: "Build not found" }),
    );

    const res = await GET(new Request("http://x"), routeContext);
    expect(res.status).toBe(404);
  });
});

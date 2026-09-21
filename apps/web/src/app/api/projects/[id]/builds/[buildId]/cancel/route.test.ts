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
  return { ...original, cancelBuild: vi.fn() };
});

import { cancelBuild } from "@kairopro/core";
import { POST } from "./route";

const routeContext = {
  params: Promise.resolve({ id: "prj-1", buildId: "build-1" }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/projects/[id]/builds/[buildId]/cancel", () => {
  it("cancels the build and returns its new state", async () => {
    vi.mocked(cancelBuild).mockResolvedValueOnce({
      id: "build-1",
      status: "CANCELLED",
    } as never);

    const res = await POST(new Request("http://x"), routeContext);

    expect(res.status).toBe(200);
    expect(cancelBuild).toHaveBeenCalledWith("build-1", {
      userId: "user-1",
      orgId: "org-1",
    });
    expect((await res.json()).status).toBe("CANCELLED");
  });

  it("is idempotent — a second cancel returns the same terminal state", async () => {
    vi.mocked(cancelBuild).mockResolvedValueOnce({
      id: "build-1",
      status: "CANCELLED",
    } as never);

    const res = await POST(new Request("http://x"), routeContext);
    expect((await res.json()).status).toBe("CANCELLED");
  });

  it("returns 404 for a build outside the caller's org", async () => {
    vi.mocked(cancelBuild).mockRejectedValueOnce(
      new NotFoundError({ message: "Build not found" }),
    );

    const res = await POST(new Request("http://x"), routeContext);
    expect(res.status).toBe(404);
  });
});

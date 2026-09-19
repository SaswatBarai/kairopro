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
  return {
    ...original,
    listCredentials: vi.fn(),
  };
});

import { listCredentials } from "@kairopro/core";
import { GET } from "./route";

const routeContext = { params: Promise.resolve({ id: "prj-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/projects/[id]/credentials", () => {
  it("returns the masked credential list", async () => {
    const list = [{ service: "stripe", status: "UNCONFIGURED", fields: [] }];
    vi.mocked(listCredentials).mockResolvedValueOnce(list as never);

    const res = await GET(new Request("http://x"), routeContext);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(list);
    expect(listCredentials).toHaveBeenCalledWith("prj-1", {
      userId: "user-1",
      orgId: "org-1",
    });
  });

  it("returns 404 for a foreign project", async () => {
    vi.mocked(listCredentials).mockRejectedValueOnce(
      new NotFoundError({ message: "Project not found" }),
    );

    const res = await GET(new Request("http://x"), routeContext);

    expect(res.status).toBe(404);
  });
});

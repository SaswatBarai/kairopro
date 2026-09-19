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
    listSpecs: vi.fn(),
  };
});

import { listSpecs } from "@kairopro/core";
import { GET } from "./route";

const routeContext = { params: Promise.resolve({ id: "prj-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/projects/[id]/specs", () => {
  it("returns the latest spec per type", async () => {
    const specs = [{ id: "spec-1", type: "PRD", version: 2 }];
    vi.mocked(listSpecs).mockResolvedValueOnce(specs as never);

    const res = await GET(new Request("http://x"), routeContext);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(specs);
    expect(listSpecs).toHaveBeenCalledWith("prj-1", {
      userId: "user-1",
      orgId: "org-1",
    });
  });

  it("returns 404 for a foreign project", async () => {
    vi.mocked(listSpecs).mockRejectedValueOnce(
      new NotFoundError({ message: "Project not found" }),
    );

    const res = await GET(new Request("http://x"), routeContext);

    expect(res.status).toBe(404);
  });
});

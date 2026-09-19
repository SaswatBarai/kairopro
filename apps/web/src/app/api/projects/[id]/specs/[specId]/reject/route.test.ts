import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@kairopro/core";

vi.mock("@/lib/request-context", () => ({
  getRequestContext: vi.fn().mockResolvedValue({
    userId: "user-1",
    orgId: "org-1",
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@kairopro/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@kairopro/core")>();
  return {
    ...original,
    rejectSpec: vi.fn(),
  };
});

import { rejectSpec } from "@kairopro/core";
import { POST } from "./route";

const routeContext = {
  params: Promise.resolve({ id: "prj-1", specId: "spec-1" }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/projects/[id]/specs/[specId]/reject", () => {
  it("rejects the spec and returns it", async () => {
    vi.mocked(rejectSpec).mockResolvedValueOnce({
      id: "spec-1",
      status: "REJECTED",
    } as never);

    const res = await POST(new Request("http://x"), routeContext);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "spec-1", status: "REJECTED" });
    expect(rejectSpec).toHaveBeenCalledWith("spec-1", {
      userId: "user-1",
      orgId: "org-1",
    });
  });

  it("returns 404 for a spec that does not exist", async () => {
    vi.mocked(rejectSpec).mockRejectedValueOnce(
      new NotFoundError({ message: "Spec not found" }),
    );

    const res = await POST(new Request("http://x"), routeContext);

    expect(res.status).toBe(404);
  });
});

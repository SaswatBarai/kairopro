import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "@kairopro/core";

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
    approveSpec: vi.fn(),
  };
});

import { approveSpec } from "@kairopro/core";
import { POST } from "./route";

const routeContext = {
  params: Promise.resolve({ id: "prj-1", specId: "spec-1" }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/projects/[id]/specs/[specId]/approve", () => {
  it("approves the spec and returns it", async () => {
    vi.mocked(approveSpec).mockResolvedValueOnce({
      id: "spec-1",
      status: "APPROVED",
    } as never);

    const res = await POST(new Request("http://x"), routeContext);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "spec-1", status: "APPROVED" });
    expect(approveSpec).toHaveBeenCalledWith("spec-1", {
      userId: "user-1",
      orgId: "org-1",
    });
  });

  it("returns a conflict for a STALE spec", async () => {
    vi.mocked(approveSpec).mockRejectedValueOnce(
      new ConflictError({ message: "Spec is stale" }),
    );

    const res = await POST(new Request("http://x"), routeContext);

    expect(res.status).toBe(409);
  });
});

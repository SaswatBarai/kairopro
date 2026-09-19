import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, ValidationError } from "@kairopro/core";

vi.mock("@/lib/request-context", () => ({
  getRequestContext: vi.fn().mockResolvedValue({
    userId: "user-1",
    orgId: "org-1",
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@kairopro/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@kairopro/core")>();
  return { ...original, revertVersion: vi.fn() };
});

import { revertVersion } from "@kairopro/core";
import { POST } from "./route";

const routeContext = {
  params: Promise.resolve({ id: "prj-1", versionId: "ver-1" }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/projects/[id]/versions/[versionId]/revert", () => {
  it("reverts and returns the new version", async () => {
    vi.mocked(revertVersion).mockResolvedValueOnce({
      id: "ver-2",
      hash: "ddd4444",
      message: "Revert: Approve PRD v1",
    } as never);

    const res = await POST(new Request("http://x"), routeContext);

    expect(res.status).toBe(200);
    expect(revertVersion).toHaveBeenCalledWith("ver-1", {
      userId: "user-1",
      orgId: "org-1",
    });
    const json = await res.json();
    expect(json.message).toBe("Revert: Approve PRD v1");
  });

  it("returns 400 when the initial commit cannot be reverted", async () => {
    vi.mocked(revertVersion).mockRejectedValueOnce(
      new ValidationError({ message: "The initial commit cannot be reverted" }),
    );

    const res = await POST(new Request("http://x"), routeContext);
    expect(res.status).toBe(400);
  });

  it("returns 409 when the workspace is dirty", async () => {
    vi.mocked(revertVersion).mockRejectedValueOnce(
      new ConflictError({ message: "Workspace has uncommitted changes" }),
    );

    const res = await POST(new Request("http://x"), routeContext);
    expect(res.status).toBe(409);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@kairopro/core";

vi.mock("@/lib/request-context", () => ({
  getRequestContext: vi
    .fn()
    .mockResolvedValue({ userId: "user-1", orgId: "org-1" }),
}));
vi.mock("@kairopro/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@kairopro/core")>();
  return { ...original, listProjectFiles: vi.fn() };
});

import { listProjectFiles } from "@kairopro/core";
import { GET } from "./route";

const routeContext = { params: Promise.resolve({ id: "prj-1" }) };
beforeEach(() => vi.clearAllMocks());

describe("GET /api/projects/[id]/files", () => {
  it("returns the project's file paths", async () => {
    vi.mocked(listProjectFiles).mockResolvedValueOnce([
      "package.json",
      "src/app/page.tsx",
    ]);

    const res = await GET(new Request("http://x"), routeContext);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(["package.json", "src/app/page.tsx"]);
    expect(listProjectFiles).toHaveBeenCalledWith("prj-1", {
      userId: "user-1",
      orgId: "org-1",
    });
  });

  it("returns 404 for a foreign project", async () => {
    vi.mocked(listProjectFiles).mockRejectedValueOnce(
      new NotFoundError({ message: "Project not found" }),
    );
    expect((await GET(new Request("http://x"), routeContext)).status).toBe(404);
  });
});

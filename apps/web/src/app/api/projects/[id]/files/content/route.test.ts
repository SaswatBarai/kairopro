import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "@kairopro/core";

vi.mock("@/lib/request-context", () => ({
  getRequestContext: vi
    .fn()
    .mockResolvedValue({ userId: "user-1", orgId: "org-1" }),
}));
vi.mock("@kairopro/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@kairopro/core")>();
  return { ...original, readProjectFile: vi.fn() };
});

import { readProjectFile } from "@kairopro/core";
import { GET } from "./route";

const routeContext = { params: Promise.resolve({ id: "prj-1" }) };
const get = (query: string) =>
  GET(
    new Request(`http://x/api/projects/prj-1/files/content${query}`),
    routeContext,
  );
beforeEach(() => vi.clearAllMocks());

describe("GET /api/projects/[id]/files/content", () => {
  it("returns the file for the requested path", async () => {
    const file = { path: "src/a.ts", size: 3, content: "abc", reason: null };
    vi.mocked(readProjectFile).mockResolvedValueOnce(file);

    const res = await get("?path=src%2Fa.ts");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(file);
    expect(readProjectFile).toHaveBeenCalledWith("prj-1", "src/a.ts", {
      userId: "user-1",
      orgId: "org-1",
    });
  });

  it("requires a path", async () => {
    expect((await get("")).status).toBe(400);
    expect(readProjectFile).not.toHaveBeenCalled();
  });

  it("maps a traversal attempt to a client error", async () => {
    vi.mocked(readProjectFile).mockRejectedValueOnce(
      new ValidationError({ message: "Path escapes the workspace root" }),
    );
    expect((await get("?path=..%2F..%2Fetc%2Fpasswd")).status).toBe(400);
  });

  it("returns 404 for a missing file", async () => {
    vi.mocked(readProjectFile).mockRejectedValueOnce(
      new NotFoundError({ message: "File not found" }),
    );
    expect((await get("?path=nope.ts")).status).toBe(404);
  });
});

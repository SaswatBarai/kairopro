import { beforeEach, describe, expect, it, vi } from "vitest";

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
    ownerOf: vi.fn(),
    getSpecGenerator: vi.fn(),
  };
});

import { getSpecGenerator, ownerOf } from "@kairopro/core";
import { POST } from "./route";

const routeContext = { params: Promise.resolve({ id: "prj-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/projects/[id]/specs/generate", () => {
  it("triggers generation and returns 202 when the caller owns the project", async () => {
    vi.mocked(ownerOf).mockResolvedValueOnce({ id: "prj-1" } as never);
    const generate = vi.fn().mockResolvedValueOnce(undefined);
    vi.mocked(getSpecGenerator).mockReturnValueOnce({
      generate,
      revise: vi.fn(),
    });

    const res = await POST(new Request("http://x"), routeContext);

    expect(res.status).toBe(202);
    expect(generate).toHaveBeenCalledWith("prj-1", {
      userId: "user-1",
      orgId: "org-1",
    });
  });

  it("returns 404, never 403, when the caller does not own the project", async () => {
    vi.mocked(ownerOf).mockResolvedValueOnce(null);

    const res = await POST(new Request("http://x"), routeContext);

    expect(res.status).toBe(404);
    expect(getSpecGenerator).not.toHaveBeenCalled();
  });
});

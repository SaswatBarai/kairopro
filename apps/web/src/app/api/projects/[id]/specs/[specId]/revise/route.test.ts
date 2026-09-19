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
    reviseSpec: vi.fn(),
  };
});

import { reviseSpec } from "@kairopro/core";
import { POST } from "./route";

const routeContext = {
  params: Promise.resolve({ id: "prj-1", specId: "spec-1" }),
};

function reviseRequest(body: unknown) {
  return new Request("http://x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/projects/[id]/specs/[specId]/revise", () => {
  it("creates a new version and returns it", async () => {
    vi.mocked(reviseSpec).mockResolvedValueOnce({
      id: "spec-2",
      version: 2,
    } as never);

    const res = await POST(
      reviseRequest({ content: { overview: "updated" } }),
      routeContext,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "spec-2", version: 2 });
    expect(reviseSpec).toHaveBeenCalledWith(
      "spec-1",
      { overview: "updated" },
      { userId: "user-1", orgId: "org-1" },
    );
  });

  it("rejects a body with no content before calling the service", async () => {
    const res = await POST(reviseRequest({}), routeContext);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(reviseSpec).not.toHaveBeenCalled();
  });
});

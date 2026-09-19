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
    getProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  };
});

import { deleteProject, getProject, updateProject } from "@kairopro/core";
import { DELETE, GET, PATCH } from "./route";

const routeContext = { params: Promise.resolve({ id: "prj-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/projects/[id]", () => {
  it("returns the project", async () => {
    vi.mocked(getProject).mockResolvedValueOnce({
      id: "prj-1",
      name: "TaskFlow",
    } as never);

    const res = await GET(new Request("http://x"), routeContext);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "prj-1", name: "TaskFlow" });
  });

  it("returns 404, never 403, for a project the caller cannot access", async () => {
    vi.mocked(getProject).mockRejectedValueOnce(
      new NotFoundError({ message: "Project not found" }),
    );

    const res = await GET(new Request("http://x"), routeContext);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Project not found" },
    });
  });
});

describe("PATCH /api/projects/[id]", () => {
  it("updates and returns the project", async () => {
    vi.mocked(updateProject).mockResolvedValueOnce({
      id: "prj-1",
      name: "Renamed",
    } as never);

    const req = new Request("http://x", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    });

    const res = await PATCH(req, routeContext);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "prj-1", name: "Renamed" });
  });

  it("rejects an invalid body with a 400 before calling the service", async () => {
    const req = new Request("http://x", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    const res = await PATCH(req, routeContext);

    expect(res.status).toBe(400);
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("returns 404 for a foreign project", async () => {
    vi.mocked(updateProject).mockRejectedValueOnce(
      new NotFoundError({ message: "Project not found" }),
    );

    const req = new Request("http://x", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    });

    const res = await PATCH(req, routeContext);

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/projects/[id]", () => {
  it("deletes the project and returns 204", async () => {
    vi.mocked(deleteProject).mockResolvedValueOnce(undefined);

    const res = await DELETE(new Request("http://x"), routeContext);

    expect(res.status).toBe(204);
    expect(deleteProject).toHaveBeenCalledWith("prj-1", {
      userId: "user-1",
      orgId: "org-1",
    });
  });

  it("returns 404 for a foreign project", async () => {
    vi.mocked(deleteProject).mockRejectedValueOnce(
      new NotFoundError({ message: "Project not found" }),
    );

    const res = await DELETE(new Request("http://x"), routeContext);

    expect(res.status).toBe(404);
  });
});

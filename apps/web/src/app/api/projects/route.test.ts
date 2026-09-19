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
    listProjects: vi.fn(),
    createProject: vi.fn(),
  };
});

import { createProject, listProjects } from "@kairopro/core";
import { GET, POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/projects", () => {
  it("returns the caller's projects", async () => {
    const projects = [{ id: "prj-1", name: "TaskFlow", status: "DRAFT" }];
    vi.mocked(listProjects).mockResolvedValueOnce(projects as never);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(projects);
    expect(listProjects).toHaveBeenCalledWith({
      userId: "user-1",
      orgId: "org-1",
    });
  });
});

describe("POST /api/projects", () => {
  it("creates a project and returns 201", async () => {
    vi.mocked(createProject).mockResolvedValueOnce({
      id: "prj-1",
      name: "TaskFlow",
      status: "DRAFT",
    } as never);

    const req = new Request("http://localhost:3000/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "TaskFlow" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      id: "prj-1",
      name: "TaskFlow",
      status: "DRAFT",
    });
  });

  it("rejects an out-of-bounds name with a 400 before calling the service", async () => {
    const req = new Request("http://localhost:3000/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(createProject).not.toHaveBeenCalled();
  });
});

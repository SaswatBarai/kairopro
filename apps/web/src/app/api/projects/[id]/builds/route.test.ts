import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "@kairopro/core";

vi.mock("@/lib/request-context", () => ({
  getRequestContext: vi.fn().mockResolvedValue({
    userId: "user-1",
    orgId: "org-1",
  }),
}));

vi.mock("@kairopro/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@kairopro/core")>();
  return { ...original, startBuild: vi.fn(), listBuilds: vi.fn() };
});

import { listBuilds, startBuild } from "@kairopro/core";
import { GET, POST } from "./route";

const routeContext = { params: Promise.resolve({ id: "prj-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/projects/[id]/builds", () => {
  it("returns 202 with the new build immediately", async () => {
    vi.mocked(startBuild).mockResolvedValueOnce({
      id: "build-1",
      projectId: "prj-1",
      status: "QUEUED",
      startedAt: null,
      finishedAt: null,
      commitHash: null,
      previewUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const res = await POST(new Request("http://x"), routeContext);

    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.status).toBe("QUEUED");
    expect(startBuild).toHaveBeenCalledWith(
      "prj-1",
      { userId: "user-1", orgId: "org-1" },
      { resume: false },
    );
  });

  it("returns 409 when a build is already active for the project", async () => {
    vi.mocked(startBuild).mockRejectedValueOnce(
      new ConflictError({ message: "A build is already running" }),
    );

    const res = await POST(new Request("http://x"), routeContext);
    expect(res.status).toBe(409);
  });

  it("returns 404 for a foreign project", async () => {
    vi.mocked(startBuild).mockRejectedValueOnce(
      new NotFoundError({ message: "Project not found" }),
    );

    const res = await POST(new Request("http://x"), routeContext);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/projects/[id]/builds", () => {
  it("lists builds for the project", async () => {
    const builds = [
      { id: "build-2", status: "SUCCEEDED" },
      { id: "build-1", status: "FAILED" },
    ];
    vi.mocked(listBuilds).mockResolvedValueOnce(builds as never);

    const res = await GET(new Request("http://x"), routeContext);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(builds);
  });
});

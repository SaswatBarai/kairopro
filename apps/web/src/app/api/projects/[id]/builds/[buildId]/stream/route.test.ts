import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@kairopro/core";

vi.mock("@/lib/request-context", () => ({
  getRequestContext: vi.fn().mockResolvedValue({
    userId: "user-1",
    orgId: "org-1",
  }),
}));

vi.mock("@kairopro/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@kairopro/core")>();
  return { ...original, getBuild: vi.fn(), streamBuildEvents: vi.fn() };
});

import { getBuild, streamBuildEvents } from "@kairopro/core";
import { GET } from "./route";

const routeContext = {
  params: Promise.resolve({ id: "prj-1", buildId: "build-1" }),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getBuild).mockResolvedValue({ id: "build-1" } as never);
});

async function readAll(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value);
  }
  return out;
}

describe("GET /api/projects/[id]/builds/[buildId]/stream", () => {
  it("sets SSE headers and streams every frame the generator yields", async () => {
    async function* fakeGenerator() {
      yield "id: 0\nevent: status\ndata: {}\n\n";
      yield "id: 1\nevent: terminal\ndata: {}\n\n";
    }
    vi.mocked(streamBuildEvents).mockReturnValueOnce(fakeGenerator());

    const res = await GET(
      new Request("http://x", { headers: {} }),
      routeContext,
    );

    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toContain("no-cache");
    const body = await readAll(res);
    expect(body).toBe(
      "id: 0\nevent: status\ndata: {}\n\nid: 1\nevent: terminal\ndata: {}\n\n",
    );
  });

  it("passes Last-Event-ID through as lastEventSeq", async () => {
    async function* emptyGenerator() {}
    vi.mocked(streamBuildEvents).mockReturnValueOnce(emptyGenerator());

    const req = new Request("http://x", {
      headers: { "Last-Event-ID": "7" },
    });
    await readAll(await GET(req, routeContext));

    expect(streamBuildEvents).toHaveBeenCalledWith(
      expect.objectContaining({ buildId: "build-1", lastEventSeq: 7 }),
    );
  });

  it("defaults to replaying everything when there is no Last-Event-ID", async () => {
    async function* emptyGenerator() {}
    vi.mocked(streamBuildEvents).mockReturnValueOnce(emptyGenerator());

    await readAll(await GET(new Request("http://x"), routeContext));

    expect(streamBuildEvents).toHaveBeenCalledWith(
      expect.objectContaining({ lastEventSeq: -1 }),
    );
  });

  it("returns 404 without opening a stream for a build outside the caller's org", async () => {
    vi.mocked(getBuild).mockRejectedValueOnce(
      new NotFoundError({ message: "Build not found" }),
    );

    const res = await GET(new Request("http://x"), routeContext);
    expect(res.status).toBe(404);
    expect(streamBuildEvents).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { TimeoutError } from "../../../lib/errors";
import { waitForContainerHealthy, waitForHttpReady } from "./health";

function dockerReturning(statuses: Array<{ Running: boolean; Health?: string }>) {
  let call = 0;
  return {
    getContainer: () => ({
      inspect: async () => {
        const state = statuses[Math.min(call, statuses.length - 1)]!;
        call += 1;
        return {
          State: {
            Running: state.Running,
            Health: state.Health ? { Status: state.Health } : undefined,
          },
        };
      },
    }),
  } as unknown as Parameters<typeof waitForContainerHealthy>[0];
}

describe("waitForContainerHealthy (BE-9)", () => {
  it("resolves immediately once Health.Status is healthy", async () => {
    const docker = dockerReturning([{ Running: true, Health: "healthy" }]);

    await expect(
      waitForContainerHealthy(docker, "c1", 1000, 5),
    ).resolves.toBeUndefined();
  });

  it("treats a container with no healthcheck configured as healthy once running", async () => {
    const docker = dockerReturning([{ Running: true }]);

    await expect(
      waitForContainerHealthy(docker, "c1", 1000, 5),
    ).resolves.toBeUndefined();
  });

  it("keeps polling through unhealthy until it settles healthy", async () => {
    const docker = dockerReturning([
      { Running: true, Health: "starting" },
      { Running: true, Health: "unhealthy" },
      { Running: true, Health: "healthy" },
    ]);

    await expect(
      waitForContainerHealthy(docker, "c1", 1000, 5),
    ).resolves.toBeUndefined();
  });

  it("throws TimeoutError if it never becomes healthy before the deadline", async () => {
    const docker = dockerReturning([{ Running: true, Health: "starting" }]);

    await expect(waitForContainerHealthy(docker, "c1", 20, 5)).rejects.toBeInstanceOf(
      TimeoutError,
    );
  });
});

describe("waitForHttpReady (BE-9)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves once the URL responds with a non-5xx status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 200 }),
    );

    await expect(waitForHttpReady("http://x/health", 1000, 5)).resolves.toBeUndefined();
  });

  it("keeps retrying through connection errors and 5xx responses", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(waitForHttpReady("http://x/health", 1000, 5)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("throws TimeoutError if the URL never becomes ready before the deadline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    await expect(waitForHttpReady("http://x/health", 20, 5)).rejects.toBeInstanceOf(
      TimeoutError,
    );
  });
});

// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { useBuildQuery } from "./builds";

let fetchMock: ReturnType<typeof vi.fn>;
const build = (status: string) => ({
  id: "b1",
  projectId: "p1",
  status,
  startedAt: null,
  finishedAt: null,
  commitHash: null,
  previewUrl: null,
  createdAt: "2026-09-25T00:00:00.000Z",
});
const respond = (status: string) =>
  fetchMock.mockImplementation(
    async () =>
      new Response(JSON.stringify(build(status)), {
        headers: { "content-type": "application/json" },
      }),
  );
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useBuildQuery polling", () => {
  it("keeps polling while the build is running", async () => {
    respond("RUNNING");
    renderHook(() => useBuildQuery("p1", "b1"), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(4100);
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
  });

  it("stops polling once the build is terminal", async () => {
    respond("SUCCEEDED");
    renderHook(() => useBuildQuery("p1", "b1"), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(12_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

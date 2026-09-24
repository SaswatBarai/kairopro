// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import {
  useApproveChangeMutation,
  useCancelChangeMutation,
  useChangesQuery,
  useRequestChangeMutation,
} from "./changes";

let fetchMock: ReturnType<typeof vi.fn>;
let client: QueryClient;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const change = (id: string, status: string) => ({
  id,
  projectId: "p1",
  status,
  request: "add tags",
  plan: null,
  commitHash: null,
  createdAt: "2026-09-25T10:00:00.000Z",
  updatedAt: "2026-09-25T10:00:00.000Z",
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useChangesQuery", () => {
  it("polls while the agent is working and stops once it is waiting or done", async () => {
    fetchMock.mockImplementation(async () => json([change("c1", "PLANNING")]));
    renderHook(() => useChangesQuery("p1"), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(2600);
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));

    fetchMock.mockClear();
    fetchMock.mockImplementation(async () =>
      json([change("c1", "AWAITING_APPROVAL")]),
    );
    await vi.advanceTimersByTimeAsync(2600);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes files and history when a change becomes applied", async () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fetchMock.mockImplementation(async () => json([change("c1", "APPLYING")]));
    renderHook(() => useChangesQuery("p1"), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    invalidate.mockClear();

    fetchMock.mockImplementation(async () => json([change("c1", "SUCCEEDED")]));
    await vi.advanceTimersByTimeAsync(2600);

    await waitFor(() => {
      const keys = invalidate.mock.calls.map((c) =>
        JSON.stringify(c[0]?.queryKey),
      );
      expect(keys).toContain(JSON.stringify(["projects", "p1", "files"]));
      expect(keys).toContain(JSON.stringify(["projects", "p1", "versions"]));
    });
  });

  it("does not refresh for a change that was already applied when first loaded", async () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fetchMock.mockImplementation(async () => json([change("c1", "SUCCEEDED")]));
    renderHook(() => useChangesQuery("p1"), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe("change mutations", () => {
  it("requests a change with the text as `request`", async () => {
    fetchMock.mockResolvedValue(json(change("c1", "PLANNING"), 202));
    const { result } = renderHook(() => useRequestChangeMutation("p1"), {
      wrapper,
    });

    await act(() => result.current.mutateAsync("Add tags"));

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/projects/p1/changes");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ request: "Add tags" });
  });

  it("approves and cancels by id", async () => {
    fetchMock.mockResolvedValue(json(change("c 1", "APPLYING"), 202));
    const approve = renderHook(() => useApproveChangeMutation("p1"), {
      wrapper,
    });
    const cancel = renderHook(() => useCancelChangeMutation("p1"), { wrapper });

    await act(() => approve.result.current.mutateAsync("c 1"));
    await act(() => cancel.result.current.mutateAsync("c 1"));

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "/api/projects/p1/changes/c%201/approve",
      "/api/projects/p1/changes/c%201/cancel",
    ]);
  });

  it("surfaces the server's message when a request is refused", async () => {
    fetchMock.mockResolvedValue(
      json({ error: { message: "Too many requests" } }, 429),
    );
    const { result } = renderHook(() => useRequestChangeMutation("p1"), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("x").catch(() => undefined);
    });

    await waitFor(() =>
      expect(result.current.error?.message).toBe("Too many requests"),
    );
  });
});

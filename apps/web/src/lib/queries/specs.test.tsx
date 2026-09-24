// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { findSpec, markSpecGenerationStarted, useSpecsQuery } from "./specs";

const PROJECT = "prj-1";

function spec(type: string, createdAt: string) {
  return {
    id: `${type}-${createdAt}`,
    projectId: PROJECT,
    type,
    version: 1,
    status: "DRAFT",
    content: {},
    createdAt,
  };
}

// A previous run's complete set, all from before `RUN_STARTED`.
const OLD_RUN = ["PRD", "DESIGN", "DATA_MODEL", "APP_STRUCTURE"].map((t) =>
  spec(t, "2026-09-23T10:00:00.000Z"),
);
const RUN_STARTED = Date.parse("2026-09-24T07:00:00.000Z");

let fetchMock: ReturnType<typeof vi.fn>;

function respondWith(specs: unknown[]) {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(specs), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  sessionStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useSpecsQuery — stale specs on regenerate", () => {
  it("returns existing specs untouched when no run was started", async () => {
    respondWith(OLD_RUN);
    const { result } = renderHook(() => useSpecsQuery(PROJECT), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(4));
    expect(findSpec(result.current.data, "PRD")).toBeDefined();
  });

  it("hides the previous run's specs so the view shows a loader", async () => {
    markSpecGenerationStarted(PROJECT, RUN_STARTED);
    respondWith(OLD_RUN);
    const { result } = renderHook(() => useSpecsQuery(PROJECT), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(findSpec(result.current.data, "PRD")).toBeUndefined();
  });

  it("shows only specs created since the run started", async () => {
    markSpecGenerationStarted(PROJECT, RUN_STARTED);
    respondWith([
      ...OLD_RUN.filter((s) => s.type !== "PRD"),
      spec("PRD", "2026-09-24T07:00:05.000Z"),
    ]);
    const { result } = renderHook(() => useSpecsQuery(PROJECT), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(findSpec(result.current.data, "PRD")).toBeDefined();
    expect(findSpec(result.current.data, "DESIGN")).toBeUndefined();
  });

  it("keeps polling while the only complete set is the stale one", async () => {
    // Regression guard: judging completeness against the raw list would see
    // the old four specs, stop polling, and never pick up the new run.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    markSpecGenerationStarted(PROJECT, RUN_STARTED);
    respondWith(OLD_RUN);
    renderHook(() => useSpecsQuery(PROJECT), { wrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(3100);
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
  });

  it("stops polling once the current run has produced all four", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    markSpecGenerationStarted(PROJECT, RUN_STARTED);
    respondWith(
      OLD_RUN.map((s) => ({ ...s, createdAt: "2026-09-24T07:01:00.000Z" })),
    );
    renderHook(() => useSpecsQuery(PROJECT), { wrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

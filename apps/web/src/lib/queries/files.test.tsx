// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { useProjectFileQuery, useProjectFilesQuery } from "./files";

let fetchMock: ReturnType<typeof vi.fn>;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("project file queries", () => {
  it("loads the project's file paths", async () => {
    fetchMock.mockResolvedValue(json(["package.json", "src/app/page.tsx"]));
    const { result } = renderHook(() => useProjectFilesQuery("p 1"), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.data).toEqual(["package.json", "src/app/page.tsx"]),
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/projects/p%201/files");
  });

  it("loads one file, with the path encoded", async () => {
    const file = {
      path: "src/[id]/page.tsx",
      size: 3,
      content: "abc",
      reason: null,
    };
    fetchMock.mockResolvedValue(json(file));
    const { result } = renderHook(
      () => useProjectFileQuery("p1", "src/[id]/page.tsx"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toEqual(file));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/p1/files/content?path=src%2F%5Bid%5D%2Fpage.tsx",
    );
  });

  it("does not fetch a file until one is chosen", () => {
    renderHook(() => useProjectFileQuery("p1", null), { wrapper });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the server's message on failure", async () => {
    fetchMock.mockResolvedValue(
      json({ error: { message: "File not found" } }, 404),
    );
    const { result } = renderHook(() => useProjectFileQuery("p1", "nope.ts"), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.error?.message).toBe("File not found"),
    );
  });
});

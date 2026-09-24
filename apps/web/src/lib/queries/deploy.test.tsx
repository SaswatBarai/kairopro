// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import {
  useDeployMutation,
  useGithubExportMutation,
  useGithubStatusQuery,
} from "./deploy";

let fetchMock: ReturnType<typeof vi.fn>;
let client: QueryClient;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("deploy", () => {
  it("posts the subdomain, and refreshes the project and the project list", async () => {
    const result = {
      projectId: "p1",
      subdomain: "notes",
      deployedUrl: "https://notes.example.dev",
    };
    fetchMock.mockResolvedValue(json(result));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { hook } = {
      hook: renderHook(() => useDeployMutation("p1"), { wrapper }),
    };

    let out: unknown;
    await act(async () => {
      out = await hook.result.current.mutateAsync({ subdomain: "notes" });
    });

    expect(out).toEqual(result);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/projects/p1/deploy");
    expect(JSON.parse(init.body)).toEqual({ subdomain: "notes" });
    const keys = invalidate.mock.calls.map((c) =>
      JSON.stringify(c[0]?.queryKey),
    );
    expect(keys).toContain(JSON.stringify(["project", "p1"]));
    expect(keys).toContain(JSON.stringify(["projects"]));
  });

  it("surfaces the server's reason when a deploy is refused", async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          error: { message: "This project has no successful build to deploy" },
        },
        409,
      ),
    );
    const { result } = renderHook(() => useDeployMutation("p1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({}).catch(() => undefined);
    });

    await waitFor(() =>
      expect(result.current.error?.message).toBe(
        "This project has no successful build to deploy",
      ),
    );
  });
});

describe("GitHub export", () => {
  it("reads whether an account is connected", async () => {
    const status = { connected: true, githubLogin: "ada", repoUrl: null };
    fetchMock.mockResolvedValue(json(status));
    const { result } = renderHook(() => useGithubStatusQuery("p1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(status));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/p1/export/github",
      expect.anything(),
    );
  });

  it("pushes with credentials to connect, or with none to reuse the connection", async () => {
    fetchMock.mockResolvedValue(
      json({ repoUrl: "https://github.com/ada/notes", defaultBranch: "main" }),
    );
    const { result } = renderHook(() => useGithubExportMutation("p1"), {
      wrapper,
    });

    await act(() =>
      result.current.mutateAsync({ accessToken: "ghp_x", githubLogin: "ada" }),
    );
    await act(() => result.current.mutateAsync(undefined));

    const bodies = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body));
    expect(bodies).toEqual([{ accessToken: "ghp_x", githubLogin: "ada" }, {}]);
    expect(fetchMock.mock.calls.every((c) => c[1].method === "POST")).toBe(
      true,
    );
  });
});

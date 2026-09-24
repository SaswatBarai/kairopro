// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { FileExplorer } from "./file-explorer";

vi.mock("motion/react", () => {
  const Plain = ({
    children,
    ...rest
  }: { children?: React.ReactNode } & Record<string, unknown>) => {
    const dom = { ...rest };
    for (const k of ["animate", "initial", "exit", "transition", "layoutId"])
      delete dom[k];
    return <div {...(dom as object)}>{children}</div>;
  };
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    motion: new Proxy({}, { get: () => Plain }),
  };
});

let fetchMock: ReturnType<typeof vi.fn>;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function renderExplorer(
  over: Partial<React.ComponentProps<typeof FileExplorer>> = {},
) {
  const props = {
    projectId: "p1",
    projectName: "TaskFlow",
    width: 240,
    activeFile: null,
    onOpenFile: vi.fn(),
    onSearch: vi.fn(),
    ...over,
  };
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <FileExplorer {...props} />
    </QueryClientProvider>,
  );
  return props;
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("FileExplorer", () => {
  it("shows the project's real files as a tree, top levels open", async () => {
    fetchMock.mockResolvedValue(
      json([
        "package.json",
        "src/app/page.tsx",
        "src/app/api/tasks/route.ts",
        "prisma/schema.prisma",
      ]),
    );
    renderExplorer();

    expect(await screen.findByText("TaskFlow")).toBeInTheDocument();
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("app")).toBeInTheDocument();
    expect(screen.getByText("page.tsx")).toBeInTheDocument();
    expect(screen.getByText("package.json")).toBeInTheDocument();
    // Deeper levels stay closed until opened.
    expect(screen.queryByText("route.ts")).not.toBeInTheDocument();
    expect(screen.getByText("4 files")).toBeInTheDocument();
  });

  it("opens a file when it is clicked", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(json(["src/app/page.tsx"]));
    const props = renderExplorer();

    await user.click(await screen.findByText("page.tsx"));

    expect(props.onOpenFile).toHaveBeenCalledWith("src/app/page.tsx");
  });

  it("opens and closes folders", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(json(["src/app/api/tasks/route.ts"]));
    renderExplorer();

    await user.click(await screen.findByText("api"));
    expect(screen.getByText("tasks")).toBeInTheDocument();

    await user.click(screen.getByText("api"));
    expect(screen.queryByText("tasks")).not.toBeInTheDocument();
  });

  it("collapses everything at once", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(json(["src/app/page.tsx"]));
    renderExplorer();
    await screen.findByText("page.tsx");

    await user.click(screen.getByTitle("Collapse folders"));

    expect(screen.queryByText("page.tsx")).not.toBeInTheDocument();
    expect(screen.getByText("src")).toBeInTheDocument();
  });

  it("points to the build when there are no files yet", async () => {
    fetchMock.mockResolvedValue(json([]));
    renderExplorer();

    expect(await screen.findByText(/No files yet/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Go to the build/ }),
    ).toHaveAttribute("href", "/projects/p1/build");
  });

  it("says so when the files can't be loaded", async () => {
    fetchMock.mockResolvedValue(
      json({ error: { message: "Project not found" } }, 404),
    );
    renderExplorer();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Project not found"),
    );
  });

  it("offers no way to create files it couldn't save", async () => {
    fetchMock.mockResolvedValue(json(["a.ts"]));
    renderExplorer();
    await screen.findByText("a.ts");

    expect(screen.queryByTitle("New file")).not.toBeInTheDocument();
    expect(screen.queryByTitle("New folder")).not.toBeInTheDocument();
  });
});

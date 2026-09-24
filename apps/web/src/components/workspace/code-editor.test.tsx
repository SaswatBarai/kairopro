// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { CodeEditor } from "./code-editor";

vi.mock("motion/react", () => {
  const Plain = ({
    children,
    ...rest
  }: { children?: React.ReactNode } & Record<string, unknown>) => {
    const dom = { ...rest };
    for (const k of ["animate", "initial", "exit", "transition", "layoutId"])
      delete dom[k];
    return <span {...(dom as object)}>{children}</span>;
  };
  return { motion: new Proxy({}, { get: () => Plain }) };
});

let files: Record<string, unknown>;
let fetchMock: ReturnType<typeof vi.fn>;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const file = (
  path: string,
  content: string | null,
  reason: string | null = null,
  size = 10,
) => ({
  path,
  size,
  content,
  reason,
});

function renderEditor(
  over: Partial<React.ComponentProps<typeof CodeEditor>> = {},
) {
  const props = {
    projectId: "p1",
    tabs: ["src/app/page.tsx"],
    activeTab: "src/app/page.tsx",
    onSelectTab: vi.fn(),
    onCloseTab: vi.fn(),
    onPreview: vi.fn(),
    onAskKairo: vi.fn(),
    ...over,
  };
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <CodeEditor {...props} />
    </QueryClientProvider>,
  );
  return props;
}

beforeEach(() => {
  files = {
    "src/app/page.tsx": file(
      "src/app/page.tsx",
      "export default function Page() {}\n",
      null,
      33,
    ),
  };
  fetchMock = vi.fn(async (url: string) => {
    const path = new URL(url, "http://x").searchParams.get("path") ?? "";
    return path in files
      ? json(files[path])
      : json({ error: { message: "File not found" } }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("CodeEditor — showing a real file", () => {
  it("shows the file's actual content, its language, size, and that it's read-only", async () => {
    renderEditor();

    expect(await screen.findByText(/export/)).toBeInTheDocument();
    expect(document.querySelector("code")).toHaveTextContent(
      "export default function Page() {}",
    );
    expect(screen.getByText("TypeScript React")).toBeInTheDocument();
    expect(screen.getByText("33 B")).toBeInTheDocument();
    expect(screen.getByText("Read-only")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/p1/files/content?path=src%2Fapp%2Fpage.tsx",
    );
  });

  it("no longer pretends to be editable", async () => {
    renderEditor();
    await screen.findByText(/export/);

    expect(screen.queryByTitle(/Save/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prettier ok/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Agent sync/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Modified/)).not.toBeInTheDocument();
  });

  it("explains a binary file rather than showing garbage", async () => {
    files["logo.png"] = file("logo.png", null, "binary");
    renderEditor({ tabs: ["logo.png"], activeTab: "logo.png" });

    expect(await screen.findByText(/isn't text/)).toBeInTheDocument();
  });

  it("explains a file that is too large, with its size", async () => {
    files["big.json"] = file("big.json", null, "too-large", 2 * 1024 * 1024);
    renderEditor({ tabs: ["big.json"], activeTab: "big.json" });

    expect(
      await screen.findByText(/too large to show here \(2048.0 KB\)/),
    ).toBeInTheDocument();
  });

  it("says so when the file can't be opened", async () => {
    renderEditor({ tabs: ["gone.ts"], activeTab: "gone.ts" });

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("File not found"),
    );
  });
});

describe("CodeEditor — tabs", () => {
  it("switches and closes tabs", async () => {
    const user = userEvent.setup();
    const props = renderEditor({ tabs: ["src/app/page.tsx", "package.json"] });
    await screen.findByText(/export/);

    await user.click(screen.getByRole("tab", { name: "package.json" }));
    expect(props.onSelectTab).toHaveBeenCalledWith("package.json");

    await user.click(
      screen.getByRole("button", { name: "Close package.json" }),
    );
    expect(props.onCloseTab).toHaveBeenCalledWith("package.json");
  });

  it("invites you to pick a file when none is open, without fetching anything", () => {
    const props = renderEditor({ tabs: [], activeTab: null });

    expect(screen.getByText("No file selected")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    screen.getByRole("button", { name: /Ask Kairo/ }).click();
    expect(props.onAskKairo).toHaveBeenCalled();
  });
});

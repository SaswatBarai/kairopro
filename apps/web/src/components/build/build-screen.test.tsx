// @vitest-environment jsdom

import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { FakeEventSource } from "@/test-utils/fake-event-source";
import { useBuildViewStore } from "@/stores/use-build-view-store";
import { BuildScreen } from "./build-screen";

const push = vi.fn();
let search = "buildId=b1";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(search),
}));
// Animation wrappers add nothing to what is asserted here. The component
// must be one stable type: a fresh function per render would remount the
// whole subtree every time and strand any element a test is holding.
vi.mock("motion/react", () => {
  const Plain = ({
    children,
    ...rest
  }: { children?: React.ReactNode } & Record<string, unknown>) => {
    const dom = { ...rest };
    for (const key of [
      "animate",
      "initial",
      "exit",
      "transition",
      "variants",
      "viewport",
      "whileInView",
    ]) {
      delete dom[key];
    }
    return <div {...(dom as object)}>{children}</div>;
  };
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    motion: new Proxy({}, { get: () => Plain }),
  };
});

let responses: Record<string, unknown>;
let fetchMock: ReturnType<typeof vi.fn>;

const build = (over: Record<string, unknown> = {}) => ({
  id: "b1",
  projectId: "p1",
  status: "RUNNING",
  startedAt: "2026-09-25T10:00:00.000Z",
  finishedAt: null,
  commitHash: null,
  previewUrl: null,
  createdAt: "2026-09-25T10:00:00.000Z",
  ...over,
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BuildScreen projectId="p1" />
    </QueryClientProvider>,
  );
}

const stream = () => FakeEventSource.latest;
const completedCounter = () =>
  screen.getByText(
    (_, el) =>
      /^\d \/ 7 completed$/.test(el?.textContent ?? "") &&
      el?.tagName === "DIV",
  );
const emit = (name: string, data: unknown, id: number) =>
  act(() => stream().emit(name, data, id));

beforeEach(() => {
  push.mockClear();
  search = "buildId=b1";
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
  useBuildViewStore.setState(useBuildViewStore.getInitialState());
  responses = {
    "GET /api/projects/p1": { id: "p1", name: "TaskFlow" },
    "GET /api/projects/p1/builds": [build()],
    "GET /api/projects/p1/builds/b1": build(),
  };
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${url}`;
    if (!(key in responses))
      return json({ error: { message: `unmocked ${key}` } }, 500);
    return json(responses[key]);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("BuildScreen — a build in progress (E1)", () => {
  it("shows the project, the seven steps, and the connection", async () => {
    renderScreen();

    expect(await screen.findByText("TaskFlow")).toBeInTheDocument();
    expect(screen.getByText("Building")).toBeInTheDocument();
    expect(screen.getByText("Preparing your environment")).toBeInTheDocument();
    expect(screen.getByText("Saving your project")).toBeInTheDocument();
    expect(completedCounter()).toHaveTextContent("0 / 7 completed");
    expect(stream().url).toBe("/api/projects/p1/builds/b1/stream");
  });

  it("moves steps forward as the backend reports its stages", async () => {
    renderScreen();
    await screen.findByText("TaskFlow");

    emit("status", { step: "provision", status: "completed" }, 0);
    emit("status", { step: "scaffold", status: "completed" }, 1);
    emit("status", { step: "schema", status: "started" }, 2);

    expect(completedCounter()).toHaveTextContent("1 / 7 completed");
    expect(screen.getByText("in progress")).toBeInTheDocument();
  });

  it("writes code onto the screen as it streams, and shows a repair", async () => {
    renderScreen();
    await screen.findByText("TaskFlow");

    emit("code", { file: "src/lib/contracts.ts", reset: true }, 0);
    emit(
      "code",
      { file: "src/lib/contracts.ts", content: "export const a = 1;" },
      1,
    );

    const code = await screen.findByRole("region", { name: "Generated code" });
    expect(code).toHaveTextContent("export const a = 1;");
    expect(screen.getAllByText("src/lib/contracts.ts").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Writing")).toBeInTheDocument();

    // The agent rewrites the file: the old text is dropped, not appended to.
    emit("code", { file: "src/lib/contracts.ts", reset: true }, 2);
    emit(
      "code",
      { file: "src/lib/contracts.ts", content: "export const b = 2;" },
      3,
    );
    expect(code).toHaveTextContent("export const b = 2;");
    expect(code).not.toHaveTextContent("export const a = 1;");
    expect(screen.getByText(/Refining/)).toBeInTheDocument();
  });

  it("shows terminal output in its own tab", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("TaskFlow");
    emit(
      "terminal",
      { stream: "stdout", line: "Scaffolded nextjs-shadcn (14 files)" },
      0,
    );

    await user.click(screen.getByRole("tab", { name: /Terminal/ }));

    expect(
      within(screen.getByRole("log", { name: "Terminal output" })).getByText(
        "Scaffolded nextjs-shadcn (14 files)",
      ),
    ).toBeInTheDocument();
  });

  it("does not mix in a different build's events", async () => {
    useBuildViewStore.setState({
      buildId: "someone-else",
      view: {
        ...useBuildViewStore.getState().view,
        terminal: [{ seq: 0, stream: "stdout", text: "old build" }],
      },
    });
    renderScreen();
    await screen.findByText("TaskFlow");

    expect(screen.queryByText("old build")).not.toBeInTheDocument();
  });
});

describe("BuildScreen — cancelling (E3)", () => {
  it("asks first, then cancels the build and shows it stopping", async () => {
    const user = userEvent.setup();
    responses["POST /api/projects/p1/builds/b1/cancel"] = build({
      status: "CANCELLED",
    });
    renderScreen();
    await screen.findByText("TaskFlow");

    await user.click(screen.getByRole("button", { name: /Cancel build/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Everything generated so far is kept");
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/cancel"),
      expect.anything(),
    );

    await user.click(
      within(dialog).getByRole("button", { name: "Cancel build" }),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/projects/p1/builds/b1/cancel",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(await screen.findByText("Stopping")).toBeInTheDocument();
  });

  it("lets you keep building", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("TaskFlow");

    await user.click(screen.getByRole("button", { name: /Cancel build/ }));
    await user.click(screen.getByRole("button", { name: "Keep building" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the stopped result once the stream reports the cancellation", async () => {
    renderScreen();
    await screen.findByText("TaskFlow");

    emit("done", { status: "CANCELLED" }, 5);

    expect(await screen.findByText("Build stopped.")).toBeInTheDocument();
    expect(
      screen.getByText(/Everything generated up to that point was kept/),
    ).toBeInTheDocument();
  });
});

describe("BuildScreen — the result (E2)", () => {
  beforeEach(() => {
    responses["GET /api/projects/p1/builds/b1"] = build({
      status: "SUCCEEDED",
      finishedAt: "2026-09-25T10:04:12.000Z",
      previewUrl: "https://preview.example/app",
    });
  });

  it("celebrates a finished build with real numbers and a way into the workspace", async () => {
    renderScreen();
    await screen.findByText("Your app is ready.");
    emit("code", { file: "a.ts", reset: true }, 0);
    emit("code", { file: "a.ts", done: true, omitted: false }, 1);

    expect(
      screen.getByText(/Built in 4 minutes 12 seconds/),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Built in .*1 file written\./),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open workspace/ }),
    ).toHaveAttribute("href", "/projects/p1");
    expect(screen.getByRole("link", { name: /Open preview/ })).toHaveAttribute(
      "href",
      "https://preview.example/app",
    );
    expect(
      screen.queryByText(/were simplified|was simplified/),
    ).not.toBeInTheDocument();
  });

  it("omits the preview link when the build has none", async () => {
    responses["GET /api/projects/p1/builds/b1"] = build({
      status: "SUCCEEDED",
      finishedAt: "2026-09-25T10:04:12.000Z",
    });
    renderScreen();

    await screen.findByText("Your app is ready.");
    expect(
      screen.queryByRole("link", { name: /Open preview/ }),
    ).not.toBeInTheDocument();
  });

  it("explains simplifications without file names, technical words, or alarm", async () => {
    renderScreen();
    await screen.findByText("Your app is ready.");
    emit(
      "code",
      {
        unit: "src/app/api/tasks/route.ts",
        level: "simpler",
        message: "internal detail: TS2322",
      },
      0,
    );
    emit(
      "code",
      { unit: "src/lib/auth.ts", level: "omit", message: "internal detail" },
      1,
    );

    const panel = (
      await screen.findByText("2 features were simplified")
    ).closest("div")!.parentElement!;
    expect(panel).toHaveTextContent("Tasks API");
    expect(panel).toHaveTextContent("Sign-in");
    expect(panel).toHaveTextContent("Not included");

    const text = panel.textContent ?? "";
    expect(text).not.toMatch(/src\/|\.tsx?\b|TS\d{4}|internal detail/);
    expect(text).not.toMatch(/\b(error|failed|failure|unable|exception)\b/i);
  });

  it("offers a way to try again after something went wrong, without exposing why", async () => {
    responses["GET /api/projects/p1/builds/b1"] = build({ status: "FAILED" });
    responses["POST /api/projects/p1/builds"] = build({
      id: "b2",
      status: "QUEUED",
    });
    const user = userEvent.setup();
    renderScreen();

    expect(
      await screen.findByText("Something went wrong."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Our team has been notified. You can try again."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Try again/ }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/projects/p1/build?buildId=b2"),
    );
  });
});

describe("BuildScreen — without a buildId", () => {
  it("opens the latest build", async () => {
    search = "";
    responses["GET /api/projects/p1/builds"] = [
      build({ id: "b1" }),
      build({ id: "old" }),
    ];
    renderScreen();

    await screen.findByText("TaskFlow");
    expect(stream().url).toBe("/api/projects/p1/builds/b1/stream");
  });

  it("points to app structure when there has never been a build", async () => {
    search = "";
    responses["GET /api/projects/p1/builds"] = [];
    renderScreen();

    expect(
      await screen.findByText("There is no build for this project yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Go to app structure/ }),
    ).toHaveAttribute("href", "/projects/new/app-structure?projectId=p1");
  });
});

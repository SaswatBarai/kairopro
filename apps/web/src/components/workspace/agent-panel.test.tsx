// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { AgentPanel } from "./agent-panel";

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
  return { motion: new Proxy({}, { get: () => Plain }) };
});

const PLAN = {
  summary: "Add a due date to tasks.",
  diffSummary: "Adds one column and updates the task form.",
  tasks: [
    { path: "prisma/schema.prisma", task: "Add dueDate to the Task model" },
    { path: "src/components/task-form.tsx", task: "Add a date picker" },
  ],
};

let list: unknown[];
let calls: Array<{ url: string; method: string; body?: unknown }>;
const change = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  projectId: "p1",
  status: "AWAITING_APPROVAL",
  request: "Add a due date to tasks",
  plan: PLAN,
  commitHash: null,
  createdAt: "2026-09-25T10:00:00.000Z",
  updatedAt: "2026-09-25T10:00:00.000Z",
  ...over,
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function renderPanel() {
  const props = {
    projectId: "p1",
    width: 380,
    onOpenHistory: vi.fn(),
    onDock: vi.fn(),
  };
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AgentPanel {...props} />
    </QueryClientProvider>,
  );
  return props;
}

beforeEach(() => {
  list = [];
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({
        url,
        method,
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      });
      if (method === "GET") return json(list);
      if (url.endsWith("/approve"))
        return json(change({ status: "APPLYING" }), 202);
      if (url.endsWith("/cancel")) return json(change({ status: "CANCELLED" }));
      return json(
        change({ id: "new", status: "PLANNING", plan: null, request: "x" }),
        202,
      );
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("AgentPanel — the conversation is the project's change history", () => {
  it("invites a first request, and has no invented history", async () => {
    renderPanel();

    expect(
      await screen.findByText(
        /Describe a change and the agent will show you a plan/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/due date/i)).not.toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("shows each request and where the agent has got to", async () => {
    list = [
      change({
        id: "a",
        status: "SUCCEEDED",
        request: "First ask",
        commitHash: "abc1234def",
        createdAt: "2026-09-25T09:00:00.000Z",
      }),
      change({
        id: "b",
        status: "PLANNING",
        plan: null,
        request: "Second ask",
        createdAt: "2026-09-25T10:00:00.000Z",
      }),
    ];
    renderPanel();

    expect(await screen.findByText("First ask")).toBeInTheDocument();
    expect(screen.getByText("Second ask")).toBeInTheDocument();
    expect(screen.getByText("abc1234")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Working out a plan");
    expect(screen.getByText("Working")).toBeInTheDocument();
  });
});

describe("AgentPanel — asking for a change", () => {
  it("sends the request to the change API", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(/Describe a change/);

    await user.type(
      screen.getByPlaceholderText("Describe a change…"),
      "Add tags{Enter}",
    );

    await waitFor(() =>
      expect(calls).toContainEqual({
        url: "/api/projects/p1/changes",
        method: "POST",
        body: { request: "Add tags" },
      }),
    );
  });

  it("won't take a second request while one is waiting on you", async () => {
    list = [change()];
    renderPanel();

    const input = await screen.findByPlaceholderText(
      /Apply or discard the pending change first/,
    );
    expect(input).toBeDisabled();
    expect(screen.getByTitle("Send")).toBeDisabled();
  });

  it("keeps Send disabled until there is something to send", async () => {
    const user = userEvent.setup();
    renderPanel();
    const send = await screen.findByTitle("Send");
    expect(send).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Describe a change…"), "x");
    expect(send).toBeEnabled();
  });
});

describe("AgentPanel — the plan (G2)", () => {
  it("shows the real plan, its files, and what changes", async () => {
    list = [change()];
    renderPanel();

    expect(await screen.findByText("Proposed changes")).toBeInTheDocument();
    expect(screen.getByText("Add a due date to tasks.")).toBeInTheDocument();
    expect(
      screen.getByText("Add dueDate to the Task model"),
    ).toBeInTheDocument();
    expect(screen.getByText("prisma/schema.prisma")).toBeInTheDocument();
    expect(screen.getByText(/Adds one column/)).toBeInTheDocument();
    expect(screen.getByText("Awaiting approval")).toBeInTheDocument();
  });

  it("offers no per-item choices, since the plan is applied whole", async () => {
    list = [change()];
    renderPanel();
    await screen.findByText("Proposed changes");

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryByText("Edit plan")).not.toBeInTheDocument();
    expect(screen.queryByText(/View diff/)).not.toBeInTheDocument();
  });

  it("applies the plan when approved", async () => {
    const user = userEvent.setup();
    list = [change()];
    renderPanel();

    await user.click(
      await screen.findByRole("button", { name: /Apply changes/ }),
    );

    await waitFor(() =>
      expect(
        calls.some(
          (c) =>
            c.url === "/api/projects/p1/changes/c1/approve" &&
            c.method === "POST",
        ),
      ).toBe(true),
    );
  });

  it("discards the plan", async () => {
    const user = userEvent.setup();
    list = [change()];
    renderPanel();

    await user.click(await screen.findByRole("button", { name: "Discard" }));

    await waitFor(() =>
      expect(
        calls.some((c) => c.url === "/api/projects/p1/changes/c1/cancel"),
      ).toBe(true),
    );
  });

  it("shows progress while applying, and lets you cancel", async () => {
    const user = userEvent.setup();
    list = [change({ status: "APPLYING" })];
    renderPanel();

    expect(
      await screen.findByText(/Applying — each file is checked/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(calls.some((c) => c.url.endsWith("/cancel"))).toBe(true),
    );
  });

  it("opens history from an applied change", async () => {
    const user = userEvent.setup();
    list = [change({ status: "SUCCEEDED", commitHash: "abc1234def" })];
    const props = renderPanel();

    await user.click(
      await screen.findByRole("button", { name: /View history/ }),
    );

    expect(props.onOpenHistory).toHaveBeenCalled();
  });
});

describe("AgentPanel — when it doesn't work out", () => {
  it("says nothing was changed when applying fails", async () => {
    list = [change({ status: "FAILED" })];
    renderPanel();

    expect(
      await screen.findByText(/couldn't be applied, so nothing was changed/),
    ).toBeInTheDocument();
  });

  it("asks for a rephrase when no plan could be made", async () => {
    list = [change({ status: "FAILED", plan: null })];
    renderPanel();

    expect(
      await screen.findByText(/couldn't work out a plan/),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Describe a change…")).toBeEnabled();
  });

  it("notes a discarded plan and lets you ask again", async () => {
    list = [change({ status: "CANCELLED" })];
    renderPanel();

    expect(
      await screen.findByText(/Discarded — nothing was changed/),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Describe a change…")).toBeEnabled();
  });

  it("shows the server's reason when a request is refused", async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      async (_u: string, init?: RequestInit) =>
        (init?.method ?? "GET") === "GET"
          ? json([])
          : json(
              {
                error: {
                  message: "Too many requests. Please slow down and try again.",
                },
              },
              429,
            ),
    );
    renderPanel();
    await screen.findByText(/Describe a change/);

    await user.type(
      screen.getByPlaceholderText("Describe a change…"),
      "x{Enter}",
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many requests",
    );
    expect(
      within(screen.getByRole("alert")).queryByText(/undefined/),
    ).toBeNull();
  });
});

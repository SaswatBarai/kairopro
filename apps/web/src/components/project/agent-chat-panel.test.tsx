// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { useSpecsQuery } from "@/lib/queries/specs";
import { useSpecChatStore } from "@/stores/use-spec-chat-store";
import { AgentChatPanel } from "./agent-chat-panel";

const PROJECT = "prj-1";

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function spec(type: string, version: number) {
  return {
    id: `${type}-${version}`,
    projectId: PROJECT,
    type,
    version,
    status: "DRAFT",
    content: {},
    createdAt: "2026-09-24T08:00:00.000Z",
  };
}

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AgentChatPanel projectId={PROJECT} />
    </QueryClientProvider>,
  );
}

function send(text: string) {
  const textarea = screen.getByLabelText(/Ask for a change/i);
  fireEvent.change(textarea, { target: { value: text } });
  fireEvent.keyDown(textarea, { key: "Enter", code: "Enter", shiftKey: false });
  return textarea;
}

beforeEach(() => {
  // The chat store is a process-wide singleton (that's the point: pages
  // share it), so each test starts from an empty one.
  useSpecChatStore.setState({ messages: {}, pending: {} });
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AgentChatPanel — layout", () => {
  it("renders textarea, send button outside input area, and shortcut hints", () => {
    renderPanel();

    const textarea = screen.getByLabelText(/Ask for a change/i);
    const sendButton = screen.getByRole("button", { name: /Send request/i });
    expect(textarea.contains(sendButton)).toBe(false);
    expect(screen.getByText("Enter")).toBeInTheDocument();
    expect(screen.getByText("Shift + Enter")).toBeInTheDocument();
  });

  it("starts with no fake conversation", () => {
    renderPanel();

    const stream = document.getElementById("chatStream")!;
    expect(stream).not.toHaveTextContent("Add subtasks to tasks");
    expect(stream).not.toHaveTextContent("PRD-001");
    expect(screen.queryByText("kairo-engine")).not.toBeInTheDocument();
  });

  it("adds newline on Shift + Enter without submitting", () => {
    renderPanel();

    const textarea = screen.getByLabelText(/Ask for a change/i);
    fireEvent.change(textarea, { target: { value: "Line 1" } });
    fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });

    expect(document.getElementById("chatStream")).not.toHaveTextContent(
      "Line 1",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps Send disabled until there is text", () => {
    renderPanel();

    const sendButton = screen.getByRole("button", { name: /Send request/i });
    expect(sendButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Ask for a change/i), {
      target: { value: "Add tags" },
    });
    expect(sendButton).toBeEnabled();
  });
});

describe("AgentChatPanel — requesting a change", () => {
  it("posts the instruction to the project's spec-change endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ summary: "Done.", specs: [] }));
    renderPanel();

    send("Add subtasks to tasks");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/projects/prj-1/specs/change");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      instruction: "Add subtasks to tasks",
    });
  });

  it("shows the user's message, a working state, then the agent's reply with the new versions", async () => {
    let respond!: (r: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        respond = resolve;
      }),
    );
    renderPanel();

    const textarea = send("Add subtasks to tasks");

    expect(screen.getByText("Add subtasks to tasks")).toBeInTheDocument();
    expect(textarea).toHaveValue("");
    // Working: status shown, input locked so a second request can't start.
    expect(await screen.findByRole("status")).toHaveTextContent(/revising/i);
    expect(screen.getByText("Kairo Agent working")).toBeInTheDocument();
    expect(textarea).toBeDisabled();

    respond(
      jsonResponse({
        summary: "Added a Subtask entity.",
        specs: [
          spec("PRD", 4),
          spec("DATA_MODEL", 3),
          spec("APP_STRUCTURE", 3),
        ],
      }),
    );

    expect(
      await screen.findByText(/Added a Subtask entity\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Updated: PRD v4 · Data model v3 · App structure v3"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Kairo Agent standby")).toBeInTheDocument();
    expect(textarea).toBeEnabled();
  });

  it("says so when the request changed nothing", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        summary: "That isn't a change to the requirements.",
        specs: [],
      }),
    );
    renderPanel();

    send("hello");

    expect(
      await screen.findByText(/isn't a change to the requirements/),
    ).toBeInTheDocument();
    expect(screen.getByText("No spec changes made.")).toBeInTheDocument();
  });

  it("shows the server's error in the chat and re-enables input", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { message: "Provider unavailable" } }, 502),
    );
    renderPanel();

    const textarea = send("Add subtasks");

    expect(
      await screen.findByText(
        "Couldn't apply that change: Provider unavailable",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(textarea).toBeEnabled();
  });

  it("refetches the spec list after a successful change", async () => {
    function SpecsProbe() {
      useSpecsQuery(PROJECT);
      return null;
    }
    const specListCalls = () =>
      fetchMock.mock.calls.filter(
        ([url, init]) =>
          url === "/api/projects/prj-1/specs" && init?.method === undefined,
      );
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/specs/change")
        ? jsonResponse({ summary: "Done.", specs: [spec("PRD", 4)] })
        : jsonResponse([]),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <SpecsProbe />
        <AgentChatPanel projectId={PROJECT} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(specListCalls()).toHaveLength(1));

    send("Add subtasks");

    await screen.findByText("Done.");
    await waitFor(() =>
      expect(specListCalls().length).toBeGreaterThanOrEqual(2),
    );
  });
});

describe("AgentChatPanel — one conversation across wizard steps", () => {
  const changeResponse = () =>
    jsonResponse({ summary: "Added subtasks.", specs: [spec("PRD", 4)] });

  it("shows the same history when another step's panel mounts", async () => {
    fetchMock.mockResolvedValue(changeResponse());
    const first = renderPanel();
    send("Add subtasks to tasks");
    await screen.findByText("Added subtasks.");
    first.unmount();

    // e.g. moving from the spec step to the data-model step
    renderPanel();

    expect(screen.getByText("Add subtasks to tasks")).toBeInTheDocument();
    expect(screen.getByText("Added subtasks.")).toBeInTheDocument();
  });

  it("keeps each project's conversation separate", async () => {
    fetchMock.mockResolvedValue(changeResponse());
    const first = renderPanel();
    send("Add subtasks to tasks");
    await screen.findByText("Added subtasks.");
    first.unmount();

    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <AgentChatPanel projectId="prj-other" />
      </QueryClientProvider>,
    );

    expect(screen.queryByText("Add subtasks to tasks")).not.toBeInTheDocument();
  });

  it("delivers the reply even if the user changed pages mid-request", async () => {
    let respond!: (r: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        respond = resolve;
      }),
    );
    const first = renderPanel();
    send("Add subtasks to tasks");
    first.unmount();

    // The next step's panel shows the request still in flight...
    renderPanel();
    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(screen.getByLabelText(/Ask for a change/i)).toBeDisabled();

    // ...and the reply lands there when it arrives.
    respond(changeResponse());
    expect(await screen.findByText("Added subtasks.")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("persists the conversation so a reload keeps it", async () => {
    fetchMock.mockResolvedValue(changeResponse());
    renderPanel();
    send("Add subtasks to tasks");
    await screen.findByText("Added subtasks.");

    const saved = JSON.parse(localStorage.getItem("kairopro-spec-chat")!);
    expect(saved.state.messages[PROJECT]).toHaveLength(2);
    // An in-flight flag must not outlive the page that owned the request.
    expect(saved.state.pending).toBeUndefined();
  });
});

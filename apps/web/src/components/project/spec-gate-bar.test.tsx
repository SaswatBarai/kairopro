// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { SpecGateBar } from "./spec-gate-bar";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useSearchParams: () => new URLSearchParams("projectId=prj-1"),
}));

describe("SpecGateBar navigation", () => {
  it("lets you go back to the questions step for this project", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SpecGateBar spec={undefined} />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("link", { name: /Back/i })).toHaveAttribute(
      "href",
      "/projects/new/questions?projectId=prj-1",
    );
  });
});

describe("SpecGateBar approval (the design is approved with the PRD)", () => {
  const push = vi.fn();
  let calls: string[];
  let failOn: string | null;

  const spec = (id: string, type: string, status = "DRAFT") =>
    ({
      id,
      type,
      status,
      projectId: "prj-1",
      version: 1,
      content: {},
      createdAt: "2026-09-25T00:00:00.000Z",
    }) as never;

  function renderBar(props: { spec: never; designSpec?: never }) {
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <SpecGateBar {...props} />
      </QueryClientProvider>,
    );
  }
  const approveButton = () =>
    screen.getByRole("button", {
      name: /Approve and continue|Continue to data model/,
    });

  beforeEach(() => {
    push.mockReset();
    calls = [];
    failOn = null;
    vi.mocked(useRouter).mockReturnValue({ push } as never);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        const failed = failOn !== null && url.includes(failOn);
        return new Response(
          JSON.stringify(
            failed ? { error: { message: "Spec is stale" } } : { id: "x" },
          ),
          {
            status: failed ? 409 : 200,
            headers: { "content-type": "application/json" },
          },
        );
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("approves the PRD, then the design, then moves on", async () => {
    renderBar({
      spec: spec("prd-1", "PRD"),
      designSpec: spec("des-1", "DESIGN"),
    });

    await userEvent.click(approveButton());

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/projects/new/data-model?projectId=prj-1",
      ),
    );
    // Order matters: approving the PRD makes the design stale, so the
    // design must be approved after it.
    expect(calls).toEqual([
      "/api/projects/prj-1/specs/prd-1/approve",
      "/api/projects/prj-1/specs/des-1/approve",
    ]);
  });

  it("approves only what isn't approved yet", async () => {
    renderBar({
      spec: spec("prd-1", "PRD", "APPROVED"),
      designSpec: spec("des-1", "DESIGN"),
    });

    await userEvent.click(approveButton());

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(calls).toEqual(["/api/projects/prj-1/specs/des-1/approve"]);
  });

  it("still works before a design exists", async () => {
    renderBar({ spec: spec("prd-1", "PRD") });

    await userEvent.click(approveButton());

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(calls).toEqual(["/api/projects/prj-1/specs/prd-1/approve"]);
  });

  it("is only approved once the design is too", () => {
    renderBar({
      spec: spec("prd-1", "PRD", "APPROVED"),
      designSpec: spec("des-1", "DESIGN"),
    });
    expect(
      screen.getByRole("button", { name: /Approve and continue/ }),
    ).toBeEnabled();
    expect(screen.queryByText("Approved")).not.toBeInTheDocument();
  });

  it("moves straight on when both are already approved, without approving again", async () => {
    renderBar({
      spec: spec("prd-1", "PRD", "APPROVED"),
      designSpec: spec("des-1", "DESIGN", "APPROVED"),
    });

    await userEvent.click(approveButton());

    expect(push).toHaveBeenCalledWith(
      "/projects/new/data-model?projectId=prj-1",
    );
    expect(calls).toEqual([]);
  });

  it("stops and says why if an approval is refused, without moving on or trying the rest", async () => {
    failOn = "prd-1";
    renderBar({
      spec: spec("prd-1", "PRD"),
      designSpec: spec("des-1", "DESIGN"),
    });

    await userEvent.click(approveButton());

    expect(await screen.findByText("Spec is stale")).toBeInTheDocument();
    expect(calls).toEqual(["/api/projects/prj-1/specs/prd-1/approve"]);
    expect(push).not.toHaveBeenCalled();
  });
});

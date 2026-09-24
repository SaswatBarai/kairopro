// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { useRouter } from "next/navigation";
import { AppStructureGateBar } from "./app-structure-gate-bar";
import { DataModelGateBar } from "./data-model-gate-bar";
import { SpecGateBar } from "./spec-gate-bar";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useSearchParams: () => new URLSearchParams("projectId=prj-1"),
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>,
  );

describe("gate bars go back one step", () => {
  it("data model → spec", () => {
    wrap(<DataModelGateBar spec={undefined} prdApproved={false} />);
    expect(screen.getByRole("link", { name: /Back/i })).toHaveAttribute(
      "href",
      "/projects/new/spec?projectId=prj-1",
    );
  });

  it("app structure → data model", () => {
    wrap(
      <AppStructureGateBar
        spec={undefined}
        prdApproved={false}
        dataModelApproved={false}
      />,
    );
    expect(screen.getByRole("link", { name: /Back/i })).toHaveAttribute(
      "href",
      "/projects/new/data-model?projectId=prj-1",
    );
  });
});

describe("an already-approved gate still moves forward", () => {
  const approved = { id: "s1", status: "APPROVED" } as never;

  it("spec → data model", async () => {
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as never);
    wrap(<SpecGateBar spec={approved} />);

    await userEvent.click(
      screen.getByRole("button", { name: /Continue to data model/i }),
    );

    expect(push).toHaveBeenCalledWith(
      "/projects/new/data-model?projectId=prj-1",
    );
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("data model → app structure", async () => {
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as never);
    wrap(<DataModelGateBar spec={approved} prdApproved />);

    await userEvent.click(
      screen.getByRole("button", { name: /Continue to app structure/i }),
    );

    expect(push).toHaveBeenCalledWith(
      "/projects/new/app-structure?projectId=prj-1",
    );
  });
});

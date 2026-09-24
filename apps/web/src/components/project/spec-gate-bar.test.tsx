// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { SpecGateBar } from "./spec-gate-bar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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

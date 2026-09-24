// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { ClarificationForm } from "./clarification-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("projectId=prj-1"),
}));

describe("ClarificationForm navigation", () => {
  it("lets you go back to the requirements step for this project", () => {
    render(<ClarificationForm />);

    const back = screen.getByRole("link", { name: /Back to requirements/i });
    expect(back).toHaveAttribute("href", "/projects/new?projectId=prj-1");
  });
});

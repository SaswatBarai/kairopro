// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { NoProjectEmptyState } from "./no-project-empty-state";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("NoProjectEmptyState component", () => {
  it("renders empty state message and create project button", async () => {
    const user = userEvent.setup();
    render(<NoProjectEmptyState stepName="project questions" />);

    expect(
      screen.getByText("You have not created a project yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Before accessing project questions/i),
    ).toBeInTheDocument();

    const createBtn = screen.getByRole("button", { name: /Create a Project/i });
    expect(createBtn).toBeInTheDocument();

    await user.click(createBtn);
    expect(mockPush).toHaveBeenCalledWith("/projects/new");
  });
});

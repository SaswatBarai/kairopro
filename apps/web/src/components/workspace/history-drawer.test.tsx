// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HistoryDrawer } from "./history-drawer";

// Mock TanStack Query hooks used by HistoryDrawer
vi.mock("@/lib/queries/versions", () => ({
  useVersionsQuery: () => ({ data: undefined, isLoading: false }),
  useRevertMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("HistoryDrawer (FE-8 / BE-8)", () => {
  it("renders history drawer with undo scope disclaimer disclosure", () => {
    render(
      <HistoryDrawer
        open={true}
        currentId="due-date"
        onClose={vi.fn()}
        onView={vi.fn()}
        onUndoCurrent={vi.fn()}
        onRevertTo={vi.fn()}
      />,
    );

    expect(screen.getByText(/History & Checkpoints/i)).toBeInTheDocument();

    // Assert the required FE-8 undo-scope correctness disclaimer is present
    const disclaimer = screen.getByText(/Undo restores code to the previous/i);
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer.textContent).toMatch(
      /AST checkpoint|Database schema changes/i,
    );
  });

  it("renders checkpoints with initial build marked appropriately", () => {
    render(
      <HistoryDrawer
        open={true}
        currentId="due-date"
        onClose={vi.fn()}
        onView={vi.fn()}
        onUndoCurrent={vi.fn()}
        onRevertTo={vi.fn()}
      />,
    );

    expect(screen.getByText("Add due date to tasks")).toBeInTheDocument();
    expect(screen.getByText("Initial build")).toBeInTheDocument();
  });
});

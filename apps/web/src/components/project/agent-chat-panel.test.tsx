// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import React from "react";
import { AgentChatPanel } from "./agent-chat-panel";

describe("AgentChatPanel component", () => {
  it("renders textarea, send button outside input area, and shortcut hints", () => {
    render(<AgentChatPanel />);

    const textarea = screen.getByLabelText(/Ask for a change/i);
    expect(textarea).toBeInTheDocument();

    const sendButton = screen.getByRole("button", { name: /Send request/i });
    expect(sendButton).toBeInTheDocument();

    // Verify Send button is outside the textarea element
    expect(textarea.contains(sendButton)).toBe(false);

    // Verify shortcut indicators
    expect(screen.getByText("Enter")).toBeInTheDocument();
    expect(screen.getByText("Shift + Enter")).toBeInTheDocument();
  });

  it("submits message on pressing Enter key alone", async () => {
    render(<AgentChatPanel />);

    const textarea = screen.getByLabelText(/Ask for a change/i);
    fireEvent.change(textarea, { target: { value: "Add dark mode toggle" } });

    fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      shiftKey: false,
    });

    // The typed message should appear in chat stream
    expect(await screen.findByText("Add dark mode toggle")).toBeInTheDocument();
    // Input should be reset
    expect(textarea).toHaveValue("");
  });

  it("adds newline on pressing Shift + Enter without submitting", async () => {
    render(<AgentChatPanel />);

    const textarea = screen.getByLabelText(/Ask for a change/i);
    fireEvent.change(textarea, { target: { value: "Line 1" } });

    // Press Shift+Enter - should not prevent default or submit
    fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });

    // Message should NOT be submitted to chat stream yet
    const chatStream = document.getElementById("chatStream");
    expect(chatStream).not.toHaveTextContent("Line 1");
  });
});

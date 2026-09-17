// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import React from "react";
import { NewProjectWorkspace } from "./new-project-workspace";

describe("NewProjectWorkspace component (C1 / FE-5 input step)", () => {
  it("renders requirements textarea and counter", () => {
    render(<NewProjectWorkspace />);

    const textarea = screen.getByLabelText(/Application requirements/i);
    expect(textarea).toBeInTheDocument();

    const charCounter = document.getElementById("char-counter");
    expect(charCounter).toBeInTheDocument();
  });

  it("updates character count when typing requirements", async () => {
    const user = userEvent.setup();
    render(<NewProjectWorkspace />);

    const textarea = screen.getByLabelText(/Application requirements/i);
    await user.clear(textarea);
    await user.type(textarea, "Hello World");

    expect(textarea).toHaveValue("Hello World");
    const charCounter = document.getElementById("char-counter");
    expect(charCounter).toHaveTextContent("11 chars");
  });

  it("clicking a template chip populates requirements textarea", async () => {
    const user = userEvent.setup();
    render(<NewProjectWorkspace />);

    const crmButton = screen.getByRole("button", { name: "CRM" });
    await user.click(crmButton);

    const textarea = screen.getByLabelText(/Application requirements/i);
    expect(textarea).toHaveValue(
      "Customer relationship management tool. Pipeline stages, lead assignment, activity timeline, contact sync, and automated deal status transition webhooks.",
    );
  });

  it("shows attached file and allows removing it", async () => {
    const user = userEvent.setup();
    render(<NewProjectWorkspace />);

    // Initially has product-requirements.pdf
    expect(screen.getByText("product-requirements.pdf")).toBeInTheDocument();
    expect(screen.getByText("1 / 5 uploaded")).toBeInTheDocument();

    const removeButton = screen.getByTitle("Remove attachment");
    await user.click(removeButton);

    expect(
      screen.queryByText("product-requirements.pdf"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("0 / 5 uploaded")).toBeInTheDocument();
  });

  it("attaches a new file selected through file picker", () => {
    render(<NewProjectWorkspace />);

    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const newFile = new File(["sample specs"], "architecture.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, { target: { files: [newFile] } });

    expect(screen.getByText("architecture.pdf")).toBeInTheDocument();
    expect(screen.getByText("1 / 5 uploaded")).toBeInTheDocument();
  });

  it("rejects unsupported file type with error message", () => {
    render(<NewProjectWorkspace />);

    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    const invalidFile = new File(["malware payload"], "exploit.exe", {
      type: "application/x-msdownload",
    });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(screen.getByText(/Unsupported file type/i)).toBeInTheDocument();
    expect(screen.queryByText("exploit.exe")).not.toBeInTheDocument();
  });

  it("rejects files larger than 10MB", () => {
    render(<NewProjectWorkspace />);

    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    const hugeBlob = new Uint8Array(11 * 1024 * 1024);
    const hugeFile = new File([hugeBlob], "large-spec.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, { target: { files: [hugeFile] } });

    expect(
      screen.getByText(/Files must be 10MB or smaller/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("large-spec.pdf")).not.toBeInTheDocument();
  });

  it("disables Generate PRD button when text length is under 10 chars", async () => {
    const user = userEvent.setup();
    render(<NewProjectWorkspace />);

    const textarea = screen.getByLabelText(/Application requirements/i);
    await user.clear(textarea);
    await user.type(textarea, "Short");

    const generateBtn = document.getElementById("generate-prd-btn");
    expect(generateBtn).toBeDisabled();

    await user.type(textarea, " long enough now");
    expect(generateBtn).not.toBeDisabled();
  });
});

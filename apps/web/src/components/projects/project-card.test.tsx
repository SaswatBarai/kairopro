// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileText } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { rememberSetupStep } from "@/lib/setup-progress";
import { ProjectCard, type Project, type ProjectStatus } from "./project-card";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const project = (
  status: ProjectStatus,
  over: Partial<Project> = {},
): Project => ({
  id: "p1",
  name: "KairoNotes",
  icon: FileText,
  iconClass: "",
  status,
  bucket: "active",
  preview: null,
  activityValue: "Updated just now",
  href: "/projects/p1",
  footerRef: status,
  ...over,
});

beforeEach(() => {
  push.mockClear();
  localStorage.clear();
});

describe("ProjectCard — where each state leads", () => {
  it("a draft resumes the setup step it was last on", async () => {
    rememberSetupStep("p1", "/projects/new/data-model");
    render(<ProjectCard project={project("draft")} />);

    await userEvent.click(
      screen.getByRole("button", { name: /Continue setup/ }),
    );

    expect(push).toHaveBeenCalledWith("/projects/new/data-model?projectId=p1");
  });

  it("a draft can also go back to the first step", async () => {
    render(<ProjectCard project={project("draft")} />);

    await userEvent.click(screen.getByTitle("Edit requirements (first step)"));

    expect(push).toHaveBeenCalledWith("/projects/new?projectId=p1");
  });

  it("a building project opens its live build", async () => {
    render(<ProjectCard project={project("building")} />);

    await userEvent.click(
      screen.getByRole("button", { name: /View live build/ }),
    );

    expect(push).toHaveBeenCalledWith("/projects/p1/build");
  });

  it.each<ProjectStatus>(["ready", "deployed"])(
    "a %s project opens its workspace",
    async (status) => {
      render(<ProjectCard project={project(status)} />);

      await userEvent.click(
        screen.getByRole("button", { name: /Open workspace/ }),
      );

      expect(push).toHaveBeenCalledWith("/projects/p1");
    },
  );
});

describe("ProjectCard — the app link", () => {
  it("opens the app's real URL in a new tab when there is one", () => {
    render(
      <ProjectCard
        project={project("deployed", {
          url: { display: "notes.example.dev", full: "notes.example.dev" },
        })}
      />,
    );

    const link = screen.getByTitle("Open app");
    expect(link).toHaveAttribute("href", "https://notes.example.dev");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("offers no dead buttons when there is no URL", () => {
    render(<ProjectCard project={project("ready")} />);

    expect(screen.queryByTitle("Open app")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Copy URL")).not.toBeInTheDocument();
    expect(screen.queryByTitle("More options")).not.toBeInTheDocument();
  });
});

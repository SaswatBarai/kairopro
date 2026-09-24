// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { DeployModal } from "./deploy-modal";
import { DeploySuccessModal } from "./deploy-success-modal";
import { ExportModal } from "./export-modal";

vi.mock("motion/react", () => {
  const Plain = ({
    children,
    ...rest
  }: { children?: React.ReactNode } & Record<string, unknown>) => {
    const dom = { ...rest };
    for (const k of ["animate", "initial", "exit", "transition"]) delete dom[k];
    return <div {...(dom as object)}>{children}</div>;
  };
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    motion: new Proxy({}, { get: () => Plain }),
  };
});

let fetchMock: ReturnType<typeof vi.fn>;
let calls: Array<{ url: string; method: string; body?: unknown }>;
let handler: (url: string, method: string) => Response;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const withClient = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {ui}
    </QueryClientProvider>,
  );

beforeEach(() => {
  calls = [];
  handler = () => json({});
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({
      url,
      method,
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    });
    return handler(url, method);
  });
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("DeployModal", () => {
  const base = {
    open: true,
    projectId: "p1",
    projectName: "Kairo Notes",
    subdomain: null,
    onClose: vi.fn(),
    onDeployed: vi.fn(),
  };

  it("suggests a subdomain from the project name and deploys with it", async () => {
    const user = userEvent.setup();
    handler = () =>
      json({
        projectId: "p1",
        subdomain: "kairo-notes",
        deployedUrl: "https://kairo-notes.example.dev",
      });
    const onDeployed = vi.fn();
    const onClose = vi.fn();
    withClient(
      <DeployModal {...base} onClose={onClose} onDeployed={onDeployed} />,
    );

    expect(screen.getByLabelText("Subdomain")).toHaveValue("kairo-notes");
    await user.click(screen.getByRole("button", { name: "Deploy" }));

    await waitFor(() =>
      expect(onDeployed).toHaveBeenCalledWith(
        "https://kairo-notes.example.dev",
      ),
    );
    expect(calls[0]).toEqual({
      url: "/api/projects/p1/deploy",
      method: "POST",
      body: { subdomain: "kairo-notes" },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("redeploys to the reserved address without asking for a subdomain", async () => {
    const user = userEvent.setup();
    handler = () =>
      json({
        projectId: "p1",
        subdomain: "notes",
        deployedUrl: "https://notes.example.dev",
      });
    withClient(<DeployModal {...base} subdomain="notes" />);

    expect(screen.queryByLabelText("Subdomain")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Redeploy" }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]!.body).toEqual({});
  });

  it("shows the server's reason and stays open when a deploy is refused", async () => {
    const user = userEvent.setup();
    handler = () =>
      json(
        {
          error: { message: "This project has no successful build to deploy" },
        },
        409,
      );
    const onClose = vi.fn();
    withClient(<DeployModal {...base} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Deploy" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "no successful build",
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Deploy" })).toBeEnabled();
  });

  it("won't deploy an address that's too short", async () => {
    const user = userEvent.setup();
    withClient(<DeployModal {...base} />);

    await user.clear(screen.getByLabelText("Subdomain"));
    await user.type(screen.getByLabelText("Subdomain"), "ab");

    expect(screen.getByRole("button", { name: "Deploy" })).toBeDisabled();
  });

  it("no longer shows made-up preflight checks or deploy steps", () => {
    withClient(<DeployModal {...base} />);
    expect(screen.queryByText(/us-east-1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/unit & e2e suites/)).not.toBeInTheDocument();
  });
});

describe("DeploySuccessModal", () => {
  it("links to the real deployed site", () => {
    withClient(
      <DeploySuccessModal
        open
        url="https://notes.example.dev"
        onClose={vi.fn()}
      />,
    );

    const link = screen.getByRole("link", { name: /Open site/ });
    expect(link).toHaveAttribute("href", "https://notes.example.dev");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText("https://notes.example.dev")).toBeInTheDocument();
  });
});

describe("ExportModal", () => {
  const base = {
    open: true,
    projectId: "p1",
    onClose: vi.fn(),
    onExported: vi.fn(),
  };
  const status = (connected: boolean) => ({
    connected,
    githubLogin: connected ? "ada" : null,
    repoUrl: null,
  });

  it("connects with a username and token, pushes, and shows the repository", async () => {
    const user = userEvent.setup();
    handler = (_u, method) =>
      method === "GET"
        ? json(status(false))
        : json({
            repoUrl: "https://github.com/ada/notes",
            defaultBranch: "main",
          });
    const onExported = vi.fn();
    withClient(<ExportModal {...base} onExported={onExported} />);

    await user.type(await screen.findByLabelText("GitHub username"), "ada");
    await user.type(
      screen.getByLabelText("Personal access token"),
      "ghp_secret",
    );
    await user.click(screen.getByRole("button", { name: "Connect and push" }));

    expect(
      await screen.findByRole("link", { name: /github.com\/ada\/notes/ }),
    ).toHaveAttribute("href", "https://github.com/ada/notes");
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.body).toEqual({
      githubLogin: "ada",
      accessToken: "ghp_secret",
    });
    expect(onExported).toHaveBeenCalledWith("Exported to GitHub");
  });

  it("keeps the token out of the browser's storage", async () => {
    const user = userEvent.setup();
    handler = (_u, method) =>
      method === "GET"
        ? json(status(false))
        : json({
            repoUrl: "https://github.com/ada/notes",
            defaultBranch: "main",
          });
    withClient(<ExportModal {...base} />);

    await user.type(await screen.findByLabelText("GitHub username"), "ada");
    await user.type(
      screen.getByLabelText("Personal access token"),
      "ghp_secret",
    );
    await user.click(screen.getByRole("button", { name: "Connect and push" }));
    await screen.findByRole("link", { name: /github.com/ });

    expect(JSON.stringify({ ...localStorage })).not.toContain("ghp_secret");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("ghp_secret");
  });

  it("masks the token as it is typed", async () => {
    handler = () => json(status(false));
    withClient(<ExportModal {...base} />);

    expect(
      await screen.findByLabelText("Personal access token"),
    ).toHaveAttribute("type", "password");
  });

  it("pushes without asking again once GitHub is connected", async () => {
    const user = userEvent.setup();
    handler = (_u, method) =>
      method === "GET"
        ? json(status(true))
        : json({
            repoUrl: "https://github.com/ada/notes",
            defaultBranch: "main",
          });
    withClient(<ExportModal {...base} />);

    expect(await screen.findByText("@ada")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Personal access token"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Push to GitHub" }));

    await waitFor(() =>
      expect(calls.some((c) => c.method === "POST")).toBe(true),
    );
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({});
  });

  it("needs both fields before it will try to connect", async () => {
    const user = userEvent.setup();
    handler = () => json(status(false));
    withClient(<ExportModal {...base} />);

    const button = await screen.findByRole("button", {
      name: "Connect and push",
    });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText("GitHub username"), "ada");
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText("Personal access token"), "x");
    expect(button).toBeEnabled();
  });

  it("shows the server's reason when GitHub refuses", async () => {
    const user = userEvent.setup();
    handler = (_u, method) =>
      method === "GET"
        ? json(status(false))
        : json({ error: { message: "GitHub rejected the token" } }, 400);
    withClient(<ExportModal {...base} />);

    await user.type(await screen.findByLabelText("GitHub username"), "ada");
    await user.type(screen.getByLabelText("Personal access token"), "bad");
    await user.click(screen.getByRole("button", { name: "Connect and push" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "GitHub rejected the token",
    );
  });
});

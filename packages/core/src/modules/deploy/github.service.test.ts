import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../lib/context";
import { ConflictError } from "../../lib/errors";
import { encryptField } from "../../platform/crypto/encryption";

vi.mock("../../platform/db/client", () => ({ db: {} }));
vi.mock("../org/access", () => ({ ownerOf: vi.fn() }));
vi.mock("./github.repository", () => ({
  findGithubConnection: vi.fn(),
  upsertGithubConnection: vi.fn(),
  setGithubConnectionRepoUrl: vi.fn(),
  deleteGithubConnection: vi.fn(),
}));
vi.mock("../../platform/workspace", () => ({
  getWorkspaceStore: vi.fn(() => ({
    resolve: vi.fn().mockResolvedValue("/workspaces/prj-1"),
  })),
}));
vi.mock("../version/git.service", () => ({ commitAll: vi.fn() }));

const gitPush = vi.fn();
const gitStatus = vi.fn();
vi.mock("simple-git", () => ({
  simpleGit: vi.fn(() => ({ push: gitPush, status: gitStatus })),
}));

const fsWriteFile = vi.fn();
vi.mock("node:fs", () => ({ promises: { writeFile: fsWriteFile } }));

import { ownerOf } from "../org/access";
import { commitAll } from "../version/git.service";
import {
  findGithubConnection,
  setGithubConnectionRepoUrl,
  upsertGithubConnection,
  type GithubConnectionRow,
} from "./github.repository";
import {
  connectGithub,
  exportToGithub,
  getGithubConnectionStatus,
} from "./github.service";

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };
const projectId = "prj-1";
const TOKEN = "ghp_super_secret_token_value";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.KAIROPRO_ENCRYPTION_KEY = "7".repeat(64);
  vi.mocked(ownerOf).mockResolvedValue({
    id: projectId,
    name: "TaskFlow",
  } as never);
  gitStatus.mockResolvedValue({ current: "main" });
  gitPush.mockResolvedValue(undefined);
  fsWriteFile.mockResolvedValue(undefined);
});

describe("connectGithub (BE-11)", () => {
  it("stores the token encrypted, never in plaintext", async () => {
    vi.mocked(upsertGithubConnection).mockImplementation((pid, data) =>
      Promise.resolve({
        id: "gh-1",
        projectId: pid,
        githubLogin: data.githubLogin,
        secrets: data.secrets,
        repoUrl: data.repoUrl ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as GithubConnectionRow),
    );

    await connectGithub(
      projectId,
      { accessToken: TOKEN, githubLogin: "octocat" },
      ctx,
    );

    const [, storedData] = vi.mocked(upsertGithubConnection).mock.calls[0]!;
    expect(JSON.stringify(storedData.secrets)).not.toContain(TOKEN);
  });
});

describe("getGithubConnectionStatus (BE-11)", () => {
  it("reports not connected when there is no row", async () => {
    vi.mocked(findGithubConnection).mockResolvedValue(null);
    const status = await getGithubConnectionStatus(projectId, ctx);
    expect(status).toEqual({
      connected: false,
      githubLogin: null,
      repoUrl: null,
    });
  });
});

describe("exportToGithub (BE-11)", () => {
  it("fails cleanly with a typed error when GitHub is not connected", async () => {
    vi.mocked(findGithubConnection).mockResolvedValue(null);
    await expect(exportToGithub(projectId, ctx)).rejects.toThrow(ConflictError);
  });

  it("creates a repo, writes a README, commits, and pushes with a transient token URL", async () => {
    const encryptionKey = Buffer.from("7".repeat(64), "hex");
    vi.mocked(findGithubConnection).mockResolvedValue({
      id: "gh-1",
      projectId,
      githubLogin: "octocat",
      secrets: { access_token: encryptField(TOKEN, encryptionKey) },
      repoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as GithubConnectionRow);

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          full_name: "octocat/prj-1",
          html_url: "https://github.com/octocat/prj-1",
          default_branch: "main",
        }),
    });

    const result = await exportToGithub(projectId, ctx, { fetchImpl });

    expect(result).toEqual({
      repoUrl: "https://github.com/octocat/prj-1",
      defaultBranch: "main",
    });
    expect(fsWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("README.md"),
      expect.stringContaining("Setup"),
      "utf8",
    );
    expect(commitAll).toHaveBeenCalledWith(
      "/workspaces/prj-1",
      expect.any(String),
    );
    expect(gitPush).toHaveBeenCalledWith(
      expect.stringContaining(TOKEN),
      "main",
    );
    expect(setGithubConnectionRepoUrl).toHaveBeenCalledWith(
      projectId,
      "https://github.com/octocat/prj-1",
    );

    // The token appears in the (mocked) push call, exactly where it's meant
    // to be used transiently — but never in anything written to disk.
    expect(fsWriteFile.mock.calls[0]![1]).not.toContain(TOKEN);
  });
});

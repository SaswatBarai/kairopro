import { simpleGit } from "simple-git";
import type { Prisma } from "@kairopro/db";
import type {
  GithubConnectInput,
  GithubConnectionStatus,
  GithubExportResult,
} from "@kairopro/contracts";
import type { RequestContext } from "../../lib/context";
import { ConflictError, NotFoundError, ProviderError } from "../../lib/errors";
import {
  decryptField,
  encryptField,
  getEncryptionKey,
  type EncryptedRecord,
} from "../../platform/crypto/encryption";
import { getWorkspaceStore } from "../../platform/workspace";
import { ownerOf } from "../org/access";
import { commitAll } from "../version/git.service";
import {
  deleteGithubConnection,
  findGithubConnection,
  setGithubConnectionRepoUrl,
  upsertGithubConnection,
  type GithubConnectionRow,
} from "./github.repository";

/**
 * GitHub export (Phase 19 / BE-11). The access token is AES-256-GCM
 * encrypted at rest — the same shape and discipline `credential.service`
 * uses for API keys (Phase 12) — and is decrypted only inside this file's
 * function bodies. On push it is embedded directly in the remote URL passed
 * to `simple-git`'s `push(remote, branch)`, which sends a plain `git push
 * <url> <branch>` without ever creating a named remote or writing the URL
 * into `.git/config` — so the token never lands in the workspace or in any
 * commit. It also never appears in a log line (every `logger` call below
 * carries only the project id and repo name).
 */

const MASK_PREFIX = "••••••••";
const TOKEN_FIELD = "access_token";

function maskValue(value: string): string {
  return `${MASK_PREFIX}${value.slice(-4)}`;
}

async function requireProjectAccess(projectId: string, ctx: RequestContext) {
  const project = await ownerOf(projectId, ctx);
  if (!project) throw new NotFoundError({ message: "Project not found" });
  return project;
}

export async function connectGithub(
  projectId: string,
  input: GithubConnectInput,
  ctx: RequestContext,
): Promise<GithubConnectionStatus> {
  await requireProjectAccess(projectId, ctx);
  const encryptionKey = getEncryptionKey();
  const secrets = {
    [TOKEN_FIELD]: encryptField(input.accessToken, encryptionKey),
  };
  const row = await upsertGithubConnection(projectId, {
    githubLogin: input.githubLogin,
    secrets: secrets as unknown as Prisma.InputJsonValue,
  });
  return toStatus(row);
}

export async function disconnectGithub(
  projectId: string,
  ctx: RequestContext,
): Promise<void> {
  await requireProjectAccess(projectId, ctx);
  await deleteGithubConnection(projectId);
}

export async function getGithubConnectionStatus(
  projectId: string,
  ctx: RequestContext,
): Promise<GithubConnectionStatus> {
  await requireProjectAccess(projectId, ctx);
  const row = await findGithubConnection(projectId);
  return toStatus(row);
}

function toStatus(row: GithubConnectionRow | null): GithubConnectionStatus {
  if (!row) return { connected: false, githubLogin: null, repoUrl: null };
  return {
    connected: true,
    githubLogin: row.githubLogin,
    repoUrl: row.repoUrl,
  };
}

function decryptToken(row: GithubConnectionRow, encryptionKey: Buffer): string {
  const secrets = row.secrets as unknown as Record<string, EncryptedRecord>;
  const encrypted = secrets[TOKEN_FIELD];
  if (!encrypted) {
    throw new ConflictError({ message: "GitHub is not connected" });
  }
  return decryptField(encrypted, encryptionKey);
}

interface GithubRepoResponse {
  full_name: string;
  html_url: string;
  default_branch: string;
}

async function createRepo(
  token: string,
  name: string,
  fetchImpl: typeof fetch,
): Promise<GithubRepoResponse> {
  const res = await fetchImpl("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ name, private: true }),
  });
  if (!res.ok) {
    throw new ProviderError({
      message: `GitHub API returned ${res.status} creating the repository`,
      details: { status: res.status },
    });
  }
  return (await res.json()) as GithubRepoResponse;
}

function generateReadme(projectName: string, repoUrl: string): string {
  return [
    `# ${projectName}`,
    "",
    "Generated and exported by KairoPro.",
    "",
    "## Setup",
    "",
    "```sh",
    "pnpm install",
    "cp .env.example .env   # fill in the values for your own environment",
    "pnpm dev",
    "```",
    "",
    `Originally exported to ${repoUrl}.`,
    "",
  ].join("\n");
}

async function pushToRemote(dir: string, remoteUrl: string): Promise<string> {
  const git = simpleGit(dir);
  const status = await git.status();
  const branch = status.current ?? "main";
  try {
    await git.push(remoteUrl, branch);
  } catch (cause) {
    throw new ProviderError({
      message: "Failed to push the workspace to GitHub",
      cause,
    });
  }
  return branch;
}

export interface ExportToGithubOptions {
  /** Injected for tests — defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

export async function exportToGithub(
  projectId: string,
  ctx: RequestContext,
  options: ExportToGithubOptions = {},
): Promise<GithubExportResult> {
  const project = await requireProjectAccess(projectId, ctx);
  const connection = await findGithubConnection(projectId);
  if (!connection) {
    throw new ConflictError({
      message: "GitHub is not connected for this project",
    });
  }

  const encryptionKey = getEncryptionKey();
  const token = decryptToken(connection, encryptionKey);
  const fetchImpl = options.fetchImpl ?? fetch;

  const repoName = project.id;
  const repo = await createRepo(token, repoName, fetchImpl);

  const workspacePath = await getWorkspaceStore().resolve(projectId, ".");
  const readme = generateReadme(project.name, repo.html_url);
  const { promises: fs } = await import("node:fs");
  const path = await import("node:path");
  await fs.writeFile(path.join(workspacePath, "README.md"), readme, "utf8");
  await commitAll(workspacePath, "docs: add README for GitHub export");

  const remoteUrl = `https://${token}@github.com/${repo.full_name}.git`;
  const branch = await pushToRemote(workspacePath, remoteUrl);

  await setGithubConnectionRepoUrl(projectId, repo.html_url);

  return { repoUrl: repo.html_url, defaultBranch: branch };
}

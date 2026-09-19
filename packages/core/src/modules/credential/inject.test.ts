import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const projectId = "prj-1";
let workspaceRoot: string;

vi.mock("./credential.repository", () => ({
  listCredentialsByProject: vi.fn(),
}));

beforeEach(async () => {
  workspaceRoot = mkdtempSync(path.join(tmpdir(), "kairopro-inject-"));
  process.env.KAIROPRO_WORKSPACE_ROOT = workspaceRoot;
  process.env.KAIROPRO_ENCRYPTION_KEY = "7".repeat(64);
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  rmSync(workspaceRoot, { recursive: true, force: true });
});

describe("injectCredentialsEnv (BE-7)", () => {
  it("writes the workspace .env with the expected keys, mode 0600", async () => {
    const { encryptField } = await import("../../platform/crypto/encryption");
    const key = Buffer.from("7".repeat(64), "hex");
    const { listCredentialsByProject } =
      await import("./credential.repository");
    vi.mocked(listCredentialsByProject).mockResolvedValue([
      {
        id: "cred-1",
        projectId,
        service: "stripe",
        secrets: { secretKey: encryptField("sk_live_abc123", key) },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);

    const { getWorkspaceStore } = await import("../../platform/workspace");
    await getWorkspaceStore().allocate(projectId);

    const { injectCredentialsEnv } = await import("./inject");
    await injectCredentialsEnv(projectId);

    const envPath = path.join(workspaceRoot, projectId, ".env");
    const contents = readFileSync(envPath, "utf8");
    expect(contents).toContain("STRIPE_SECRET_KEY=");
    expect(contents).toContain("sk_live_abc123");

    const mode = statSync(envPath).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("rewrites the .env without a deleted credential's key", async () => {
    const { encryptField } = await import("../../platform/crypto/encryption");
    const key = Buffer.from("7".repeat(64), "hex");
    const { listCredentialsByProject } =
      await import("./credential.repository");
    const { getWorkspaceStore } = await import("../../platform/workspace");
    await getWorkspaceStore().allocate(projectId);
    const { injectCredentialsEnv } = await import("./inject");

    vi.mocked(listCredentialsByProject).mockResolvedValue([
      {
        id: "cred-1",
        projectId,
        service: "stripe",
        secrets: { secretKey: encryptField("sk_live_abc123", key) },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cred-2",
        projectId,
        service: "sendgrid",
        secrets: { apiKey: encryptField("sg_key_xyz", key) },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);
    await injectCredentialsEnv(projectId);

    // Simulate "stripe" having been deleted: the repository now returns
    // only what's left.
    vi.mocked(listCredentialsByProject).mockResolvedValue([
      {
        id: "cred-2",
        projectId,
        service: "sendgrid",
        secrets: { apiKey: encryptField("sg_key_xyz", key) },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);
    await injectCredentialsEnv(projectId);

    const envPath = path.join(workspaceRoot, projectId, ".env");
    const contents = readFileSync(envPath, "utf8");
    expect(contents).not.toContain("STRIPE_SECRET_KEY");
    expect(contents).not.toContain("sk_live_abc123");
    expect(contents).toContain("SENDGRID_API_KEY=");

    const mode = statSync(envPath).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("writes an empty file when there are no credentials", async () => {
    const { listCredentialsByProject } =
      await import("./credential.repository");
    vi.mocked(listCredentialsByProject).mockResolvedValue([]);

    const { getWorkspaceStore } = await import("../../platform/workspace");
    await getWorkspaceStore().allocate(projectId);
    const { injectCredentialsEnv } = await import("./inject");
    await injectCredentialsEnv(projectId);

    const envPath = path.join(workspaceRoot, projectId, ".env");
    expect(readFileSync(envPath, "utf8")).toBe("");
  });
});

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetDb, testDb } from "./helpers";

const workspaceRoot = mkdtempSync(join(tmpdir(), "kairopro-it-gate4-"));
process.env.KAIROPRO_WORKSPACE_ROOT = workspaceRoot;

const core = await import("@kairopro/core");
const prisma = testDb();

beforeEach(async () => {
  await resetDb(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(workspaceRoot, { recursive: true, force: true });
});

let seedCounter = 0;
async function seedOrgWithOwner() {
  const email = `ada-gate4-${++seedCounter}@lovelace.dev`;
  const user = await prisma.user.create({
    data: { name: "Ada Lovelace", email },
  });
  const org = await prisma.organization.create({
    data: {
      name: "kairo-gate4",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  return { user, org, ctx: { userId: user.id, orgId: org.id } };
}

describe("Integration Gate I-4: Credentials & Versioning (BE-7, BE-8)", () => {
  it("injects credential into workspace .env with mode 0600, masking plaintext secrets", async () => {
    const { ctx } = await seedOrgWithOwner();
    const project = await core.createProject({ name: "SecureApp" }, ctx);
    const wsPath = join(workspaceRoot, project.id);

    const secretKey = "sk_live_very_secret_key_998877665544";

    // Set credential via putCredential
    await core.putCredential(
      project.id,
      { service: "stripe", values: { secretKey } },
      ctx,
    );

    // List credentials must return masked values
    const creds = await core.listCredentials(project.id, ctx);
    const stripeCred = creds.find((c) => c.service === "stripe");
    expect(stripeCred).toBeDefined();
    expect(stripeCred?.status).toBe("CONNECTED");
    expect(stripeCred?.fields[0]?.maskedValue).not.toBe(secretKey);
    expect(stripeCred?.fields[0]?.maskedValue).toContain("••••");

    const envPath = join(wsPath, ".env");
    expect(existsSync(envPath)).toBe(true);

    // Check file permissions (mode 0600 = octal 600)
    const stats = statSync(envPath);
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);

    const envContent = readFileSync(envPath, "utf8");
    expect(envContent).toContain(`STRIPE_SECRET_KEY="${secretKey}"`);
  });

  it("revert produces a new commit, leaves history linear, and refuses dirty workspaces", async () => {
    const { ctx } = await seedOrgWithOwner();
    const project = await core.createProject({ name: "VersionApp" }, ctx);
    const wsPath = join(workspaceRoot, project.id);

    // Initial commit exists
    const initialVersions = await core.listVersions(project.id, ctx);
    expect(initialVersions.length).toBeGreaterThanOrEqual(1);

    // Make a change and record a commit
    writeFileSync(join(wsPath, "feature.txt"), "console.log('v1');\n");
    const v2 = await core.recordVersion(
      project.id,
      wsPath,
      "Add feature.txt",
      ctx,
    );
    expect(v2.filesChanged).toBe(1);
    expect(v2.revertible).toBe(true);

    const versionsAfterChange = await core.listVersions(project.id, ctx);
    expect(versionsAfterChange.length).toBe(initialVersions.length + 1);

    // Test dirty workspace refusal
    writeFileSync(join(wsPath, "uncommitted.txt"), "dirty work in progress\n");
    await expect(core.revertVersion(v2.id, ctx)).rejects.toThrow(
      /uncommitted/i,
    );

    // Clean up uncommitted file
    rmSync(join(wsPath, "uncommitted.txt"));

    // Revert clean workspace -> produces a new forward commit (linear history)
    const revertedVersion = await core.revertVersion(v2.id, ctx);
    expect(revertedVersion).toBeDefined();

    const versionsAfterRevert = await core.listVersions(project.id, ctx);
    // Linear history: one more commit was added forward
    expect(versionsAfterRevert.length).toBe(versionsAfterChange.length + 1);
    expect(revertedVersion.message).toContain("Revert");
  });
});

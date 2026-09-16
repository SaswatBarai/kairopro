import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetDb, testDb } from "./helpers";

// The workspace root must be pinned before the core singleton resolves it.
const workspaceRoot = mkdtempSync(join(tmpdir(), "kairopro-it-ws-"));
process.env.KAIROPRO_WORKSPACE_ROOT = workspaceRoot;

const core = await import("@kairopro/core");
const { headCommit } = core;
const prisma = testDb();

beforeEach(async () => {
  await resetDb(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(workspaceRoot, { recursive: true, force: true });
});

/** Owner user + org, the way registration creates them. */
let seedCounter = 0;
async function seedOrgWithOwner() {
  const email = `ada-${++seedCounter}@lovelace.dev`;
  const user = await prisma.user.create({
    data: { name: "Ada Lovelace", email },
  });
  const org = await prisma.organization.create({
    data: {
      name: "kairo-core",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  return { user, org, ctx: { userId: user.id, orgId: org.id } };
}

describe("project lifecycle (BE-4, real DB + real workspace)", () => {
  it("create → row with stored workspacePath + git repo with initial commit", async () => {
    const { ctx } = await seedOrgWithOwner();

    const project = await core.createProject({ name: "TaskFlow" }, ctx);

    expect(project.status).toBe("DRAFT");
    expect(project).not.toHaveProperty("workspacePath"); // contract shape; stored on the row

    const row = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(row.workspacePath).toBe(join(workspaceRoot, project.id));
    expect(existsSync(join(workspaceRoot, project.id, ".git"))).toBe(true);
    expect(await headCommit(workspaceRoot + "/" + project.id)).toMatch(
      /^[0-9a-f]{7}$/,
    );
  });

  it("list is scoped to the caller's org", async () => {
    const { org, ctx } = await seedOrgWithOwner();
    const foreign = await seedOrgWithOwner();
    await prisma.project.create({
      data: { orgId: foreign.org.id, name: "Foreign" },
    });

    await core.createProject({ name: "Mine" }, ctx);
    const items = await core.listProjects(ctx);

    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe("Mine");
    expect(items[0]!.orgId).toBe(org.id);
  });

  it("get/update of a foreign project throws NotFoundError (404, never 403)", async () => {
    const { ctx } = await seedOrgWithOwner();
    const foreign = await seedOrgWithOwner();
    const project = await prisma.project.create({
      data: { orgId: foreign.org.id, name: "Foreign" },
    });

    await expect(core.getProject(project.id, ctx)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      core.updateProject(project.id, { name: "Hijacked" }, ctx),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("delete removes both the DB row and the workspace directory", async () => {
    const { ctx } = await seedOrgWithOwner();

    const project = await core.createProject({ name: "Doomed" }, ctx);
    const wsPath = join(workspaceRoot, project.id);
    expect(existsSync(wsPath)).toBe(true);

    await core.deleteProject(project.id, ctx);

    expect(await prisma.project.count({ where: { id: project.id } })).toBe(0);
    expect(existsSync(wsPath)).toBe(false);
  });

  it("emit records a UsageEvent against the real database", async () => {
    const { org, ctx } = await seedOrgWithOwner();
    const project = await core.createProject({ name: "Metered" }, ctx);

    await core.emit("LLM_TOKENS", 12400, ctx, { projectId: project.id });

    const events = await prisma.usageEvent.findMany({
      where: { orgId: org.id },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("LLM_TOKENS");
    expect(events[0]!.quantity).toBe(12400);
    expect(events[0]!.projectId).toBe(project.id);
  });
});

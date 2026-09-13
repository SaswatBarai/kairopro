import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetDb, testDb } from "./helpers";

const prisma = testDb();

beforeEach(async () => {
  await resetDb(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function seedOrgWithOwner() {
  return prisma.organization.create({
    data: {
      name: "kairo-core",
      memberships: {
        create: {
          role: "OWNER",
          user: { create: { name: "Ada Lovelace", email: "ada@lovelace.dev" } },
        },
      },
    },
    include: { memberships: { include: { user: true } } },
  });
}

describe("data layer (Phase 1)", () => {
  it("creates a user with an org and an owner membership in one atomic write", async () => {
    const org = await seedOrgWithOwner();

    expect(org.name).toBe("kairo-core");
    expect(org.memberships).toHaveLength(1);
    const membership = org.memberships[0]!;
    expect(membership.role).toBe("OWNER");
    expect(membership.user.email).toBe("ada@lovelace.dev");

    // The reverse side exists too: the user has exactly this membership.
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "ada@lovelace.dev" },
      include: { memberships: true },
    });
    expect(user.memberships.map((m) => m.orgId)).toEqual([org.id]);
  });

  it("deleting a project cascades to specs, builds, versions, inputs, and credentials", async () => {
    const org = await seedOrgWithOwner();
    const project = await prisma.project.create({
      data: { orgId: org.id, name: "TaskFlow" },
    });
    const projectId = project.id;

    await prisma.input.create({
      data: {
        projectId,
        kind: "TEXT",
        storedName: "inputs/01.txt",
        sizeBytes: 10,
      },
    });
    await prisma.spec.create({
      data: { projectId, type: "PRD", version: 1, content: { ok: true } },
    });
    await prisma.version.create({
      data: { projectId, hash: "abc123", message: "Initial project" },
    });
    await prisma.credential.create({
      data: {
        projectId,
        service: "stripe",
        secrets: { secretKey: { iv: "i", tag: "t", data: "d" } },
      },
    });
    const build = await prisma.build.create({ data: { projectId } });
    await prisma.buildLog.create({
      data: { buildId: build.id, seq: 0, type: "STEP", content: "start" },
    });

    await prisma.project.delete({ where: { id: projectId } });

    expect(await prisma.project.count({ where: { id: projectId } })).toBe(0);
    expect(await prisma.spec.count({ where: { projectId } })).toBe(0);
    expect(await prisma.version.count({ where: { projectId } })).toBe(0);
    expect(await prisma.input.count({ where: { projectId } })).toBe(0);
    expect(await prisma.credential.count({ where: { projectId } })).toBe(0);
    expect(await prisma.build.count({ where: { projectId } })).toBe(0);
    expect(await prisma.buildLog.count({ where: { buildId: build.id } })).toBe(
      0,
    );

    // The org itself survives project deletion.
    expect(await prisma.organization.count({ where: { id: org.id } })).toBe(1);
  });

  it("rejects a duplicate BuildLog sequence within one build", async () => {
    const org = await seedOrgWithOwner();
    const project = await prisma.project.create({
      data: { orgId: org.id, name: "TaskFlow" },
    });
    const build = await prisma.build.create({
      data: { projectId: project.id },
    });

    await prisma.buildLog.create({
      data: { buildId: build.id, seq: 0, type: "STEP", content: "first" },
    });

    await expect(
      prisma.buildLog.create({
        data: { buildId: build.id, seq: 0, type: "STDOUT", content: "dup" },
      }),
    ).rejects.toMatchObject({ code: "P2002" });

    // A different build may reuse the same seq — the constraint is per build.
    const otherBuild = await prisma.build.create({
      data: { projectId: project.id },
    });
    await prisma.buildLog.create({
      data: { buildId: otherBuild.id, seq: 0, type: "STEP", content: "ok" },
    });
  });

  it("rejects a duplicate Spec version for the same project and type", async () => {
    const org = await seedOrgWithOwner();
    const project = await prisma.project.create({
      data: { orgId: org.id, name: "TaskFlow" },
    });

    await prisma.spec.create({
      data: { projectId: project.id, type: "PRD", version: 1, content: {} },
    });

    await expect(
      prisma.spec.create({
        data: { projectId: project.id, type: "PRD", version: 1, content: {} },
      }),
    ).rejects.toMatchObject({ code: "P2002" });

    // Same type, next version: allowed. Different type, same version: allowed.
    await prisma.spec.create({
      data: { projectId: project.id, type: "PRD", version: 2, content: {} },
    });
    await prisma.spec.create({
      data: { projectId: project.id, type: "DESIGN", version: 1, content: {} },
    });
  });

  it("keeps usage events when their project is deleted (billing records survive)", async () => {
    const org = await seedOrgWithOwner();
    const project = await prisma.project.create({
      data: { orgId: org.id, name: "TaskFlow" },
    });
    await prisma.usageEvent.create({
      data: {
        orgId: org.id,
        projectId: project.id,
        kind: "LLM_TOKENS",
        quantity: 100,
      },
    });

    await prisma.project.delete({ where: { id: project.id } });

    const events = await prisma.usageEvent.findMany({
      where: { orgId: org.id },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.projectId).toBeNull();
    expect(events[0]!.quantity).toBe(100);
  });
});

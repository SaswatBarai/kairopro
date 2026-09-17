import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetDb, testDb } from "./helpers";
import { getObjectStorage, ProviderError } from "@kairopro/core";

const workspaceRoot = mkdtempSync(join(tmpdir(), "kairopro-it-ws-input-"));
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
  const email = `ada-input-${++seedCounter}@lovelace.dev`;
  const user = await prisma.user.create({
    data: { name: "Ada Lovelace", email },
  });
  const org = await prisma.organization.create({
    data: {
      name: "kairo-input-test",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  return { user, org, ctx: { userId: user.id, orgId: org.id } };
}

describe("input lifecycle (Phase 5 BE-5, real DB + MinIO)", () => {
  it("persists requirements text input and upserts on update", async () => {
    const { ctx } = await seedOrgWithOwner();
    const project = await core.createProject({ name: "InputTestPrj" }, ctx);

    const initial = await core.saveTextInput(
      project.id,
      "Build a modern CRM dashboard",
      ctx,
    );
    expect(initial.kind).toBe("TEXT");
    expect(initial.extraction).toBe("Build a modern CRM dashboard");

    const row = await prisma.input.findFirstOrThrow({
      where: { projectId: project.id, kind: "TEXT" },
    });
    expect(row.extraction).toBe("Build a modern CRM dashboard");

    // Upsert — modifies the existing TEXT input row instead of creating a second one
    const updated = await core.saveTextInput(
      project.id,
      "Build a modern CRM dashboard with real-time stats",
      ctx,
    );
    expect(updated.id).toBe(initial.id);
    expect(updated.extraction).toBe(
      "Build a modern CRM dashboard with real-time stats",
    );

    const count = await prisma.input.count({
      where: { projectId: project.id, kind: "TEXT" },
    });
    expect(count).toBe(1);
  });

  it("stores file uploads in MinIO, extracts text, and generates storedName", async () => {
    const { ctx } = await seedOrgWithOwner();
    const project = await core.createProject({ name: "FilesPrj" }, ctx);

    const txtContent = "Specification: user authentication and role management";
    const txtBuffer = Buffer.from(txtContent, "utf8");

    const created = await core.createFileInputs(
      project.id,
      [{ buffer: txtBuffer, originalName: "spec.txt" }],
      ctx,
    );

    expect(created).toHaveLength(1);
    expect(created[0]!.kind).toBe("FILE");
    expect(created[0]!.originalName).toBe("spec.txt");
    expect(created[0]!.mimeType).toBe("text/plain");
    expect(created[0]!.extraction).toBe(txtContent);

    // Stored object exists in MinIO
    const row = await prisma.input.findUniqueOrThrow({
      where: { id: created[0]!.id },
    });
    expect(row.storedName).toMatch(/^[0-9a-f-]{36}\.txt$/);

    const storage = getObjectStorage();
    const storedBytes = await storage.get(project.id, row.storedName);
    expect(storedBytes.toString("utf8")).toBe(txtContent);

    // Clean up
    await core.deleteInput(project.id, created[0]!.id, ctx);
    expect(await prisma.input.count({ where: { id: created[0]!.id } })).toBe(0);
    await expect(
      storage.get(project.id, row.storedName),
    ).rejects.toBeInstanceOf(ProviderError);
  });

  it("deleting a project removes its uploads from MinIO and cascades DB rows", async () => {
    const { ctx } = await seedOrgWithOwner();
    const project = await core.createProject({ name: "DoomedUploads" }, ctx);

    const created = await core.createFileInputs(
      project.id,
      [
        { buffer: Buffer.from("Upload 1"), originalName: "one.txt" },
        { buffer: Buffer.from("Upload 2"), originalName: "two.txt" },
      ],
      ctx,
    );

    const rows = await prisma.input.findMany({
      where: { projectId: project.id },
    });
    expect(rows).toHaveLength(2);

    const storage = getObjectStorage();
    for (const r of rows) {
      const bytes = await storage.get(project.id, r.storedName);
      expect(bytes.length).toBeGreaterThan(0);
    }

    // Delete project
    await core.deleteProject(project.id, ctx);

    // Verify DB rows cascaded
    expect(await prisma.input.count({ where: { projectId: project.id } })).toBe(
      0,
    );
    expect(await prisma.project.count({ where: { id: project.id } })).toBe(0);

    // Verify MinIO objects are gone
    for (const r of rows) {
      await expect(
        storage.get(project.id, r.storedName),
      ).rejects.toBeInstanceOf(ProviderError);
    }
  });

  it("corrupt file records null extraction and does not fail the request", async () => {
    const { ctx } = await seedOrgWithOwner();
    const project = await core.createProject({ name: "CorruptPrj" }, ctx);

    const corruptPdf = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.alloc(32, 0x00),
    ]);

    const created = await core.createFileInputs(
      project.id,
      [{ buffer: corruptPdf, originalName: "broken.pdf" }],
      ctx,
    );

    expect(created).toHaveLength(1);
    expect(created[0]!.mimeType).toBe("application/pdf");
    expect(created[0]!.extraction).toBeNull();

    const row = await prisma.input.findUniqueOrThrow({
      where: { id: created[0]!.id },
    });
    expect(row.extraction).toBeNull();
  });
});

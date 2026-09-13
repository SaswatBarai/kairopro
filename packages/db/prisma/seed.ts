import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/index";

// Same rule as prisma.config.ts: the root .env is the only env file.
const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../../.env") });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * The demo state the shipped pages already display as static mock data:
 * Ada Lovelace (ada@lovelace.dev) in her personal org kairo-core, with the
 * DEPLOYED project TaskFlow — approved specs and a completed, healthy build.
 *
 * Fixed ids keep the seed deterministic; the organization cascade wipes the
 * whole tree, so reseeding is always clean.
 */
async function main() {
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const ada = await prisma.user.create({
    data: {
      id: "usr_ada",
      name: "Ada Lovelace",
      email: "ada@lovelace.dev",
      emailVerified: new Date("2026-09-01T08:00:00Z"),
    },
  });

  const org = await prisma.organization.create({
    data: {
      id: "org_kairo_core",
      name: "kairo-core",
      memberships: {
        create: { id: "mem_ada", userId: ada.id, role: "OWNER" },
      },
    },
  });

  const taskflow = await prisma.project.create({
    data: {
      id: "prj_taskflow",
      orgId: org.id,
      userId: ada.id,
      name: "TaskFlow",
      description: "A team task manager with boards and assignments",
      status: "DEPLOYED",
      templateId: "nextjs-shadcn",
      deployedUrl: "https://taskflow.kairopro.app",
      createdAt: new Date("2026-09-01T09:12:00Z"),
      updatedAt: new Date("2026-09-12T16:40:00Z"),
    },
  });

  await prisma.input.createMany({
    data: [
      {
        id: "inp_taskflow_text",
        projectId: taskflow.id,
        kind: "TEXT",
        storedName: "inputs/text-01.txt",
        sizeBytes: 96,
        extraction:
          "A task manager where teams organize work on boards, assign owners, and track due dates.",
        createdAt: new Date("2026-09-01T09:14:00Z"),
      },
      {
        id: "inp_taskflow_prd",
        projectId: taskflow.id,
        kind: "FILE",
        originalName: "taskflow-prd.pdf",
        mimeType: "application/pdf",
        storedName: "inputs/prd-02.pdf",
        sizeBytes: 184320,
        extraction:
          "Team task management with boards, assignees, and due dates…",
        createdAt: new Date("2026-09-01T09:30:00Z"),
      },
    ],
  });

  await prisma.spec.createMany({
    data: [
      {
        id: "spec_taskflow_prd",
        projectId: taskflow.id,
        type: "PRD",
        version: 3,
        status: "APPROVED",
        content: {
          overview:
            "Team task management with boards, assignees, and due dates",
          personas: ["Team lead", "Contributor"],
        },
        createdAt: new Date("2026-09-02T11:05:00Z"),
      },
      {
        id: "spec_taskflow_design",
        projectId: taskflow.id,
        type: "DESIGN",
        version: 1,
        status: "APPROVED",
        content: {
          system: "Minimal dark workspace, mono accents, dense data tables",
          screens: ["Board", "Task detail", "Reports"],
        },
        createdAt: new Date("2026-09-03T10:00:00Z"),
      },
      {
        id: "spec_taskflow_data_model",
        projectId: taskflow.id,
        type: "DATA_MODEL",
        version: 1,
        status: "APPROVED",
        content: {
          tables: [
            { name: "Task", columns: ["id", "title", "status", "assigneeId"] },
            { name: "Board", columns: ["id", "name", "projectId"] },
          ],
        },
        createdAt: new Date("2026-09-03T14:20:00Z"),
      },
      {
        id: "spec_taskflow_app_structure",
        projectId: taskflow.id,
        type: "APP_STRUCTURE",
        version: 1,
        status: "APPROVED",
        content: {
          routes: ["/", "/board/[id]", "/tasks/[id]", "/reports"],
          components: ["Board", "TaskCard", "AssigneePicker"],
        },
        createdAt: new Date("2026-09-04T09:45:00Z"),
      },
    ],
  });

  await prisma.version.create({
    data: {
      id: "ver_taskflow_12",
      projectId: taskflow.id,
      hash: "7e2f1a3b9c4d5e6f",
      message: "feat: drag-to-reorder and task filters",
      filesChanged: 6,
      revertible: true,
      createdAt: new Date("2026-09-12T16:38:00Z"),
    },
  });

  const build = await prisma.build.create({
    data: {
      id: "bld_taskflow_7",
      projectId: taskflow.id,
      status: "SUCCEEDED",
      startedAt: new Date("2026-09-12T15:02:00Z"),
      finishedAt: new Date("2026-09-12T15:31:00Z"),
      commitHash: "7e2f1a3b9c4d",
      previewUrl: "https://taskflow-7e2f1a.preview.kairopro.app",
      createdAt: new Date("2026-09-12T15:01:00Z"),
    },
  });

  await prisma.buildLog.createMany({
    data: [
      {
        buildId: build.id,
        seq: 0,
        type: "STEP",
        content: "Initializing workspace from template nextjs-shadcn",
        createdAt: new Date("2026-09-12T15:02:01Z"),
      },
      {
        buildId: build.id,
        seq: 1,
        type: "STDOUT",
        content: "Dependencies installed in 41s",
        createdAt: new Date("2026-09-12T15:03:12Z"),
      },
      {
        buildId: build.id,
        seq: 2,
        type: "CHECKPOINT",
        content: "Dependencies installed",
        createdAt: new Date("2026-09-12T15:03:30Z"),
      },
      {
        buildId: build.id,
        seq: 3,
        type: "STDOUT",
        content: "✓ Compiled successfully in 89s",
        createdAt: new Date("2026-09-12T15:20:11Z"),
      },
      {
        buildId: build.id,
        seq: 4,
        type: "STEP",
        content: "Build complete — preview available",
        createdAt: new Date("2026-09-12T15:31:00Z"),
      },
    ],
  });

  // Period totals the billing page displays: 12,400 tokens · 7 builds ·
  // 213 container minutes.
  await prisma.usageEvent.createMany({
    data: [
      {
        id: "use_taskflow_tokens",
        orgId: org.id,
        projectId: taskflow.id,
        kind: "LLM_TOKENS",
        quantity: 12400,
        createdAt: new Date("2026-09-12T15:05:00Z"),
      },
      {
        id: "use_taskflow_builds",
        orgId: org.id,
        projectId: taskflow.id,
        kind: "BUILD",
        quantity: 7,
        createdAt: new Date("2026-09-12T15:31:00Z"),
      },
      {
        id: "use_taskflow_minutes",
        orgId: org.id,
        projectId: taskflow.id,
        kind: "CONTAINER_MINUTE",
        quantity: 213,
        createdAt: new Date("2026-09-12T16:00:00Z"),
      },
    ],
  });

  console.log(
    `Seeded: ${ada.email} / ${org.name} — ${taskflow.name} (${taskflow.status})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

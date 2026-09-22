import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMProvider } from "@kairopro/core";
import { resetDb, testDb } from "./helpers";

/**
 * Integration Gate I-7 (AI-8 ↔ BE-9): "independent verification works end
 * to end." Every checklist item is exercised against real infrastructure —
 * a real git workspace, real Postgres `InternalError` rows, and the real
 * `StubContainerRuntime` (standing in for "the project container", same
 * substitution the other gate tests use — it really execs on the host, no
 * Docker daemon required) actually running `npx vitest` and reading back
 * its real JSON report. Only the LLM is faked, scripted to return known
 * content.
 *
 * Finding this real bug is *why* this file exists rather than trusting the
 * unit tests: the installed Vitest writes its `--reporter=json` output to
 * `.vitest/json/output.json` by default and only a confirmation *message*
 * to stdout — `run-tests.ts`'s original `> report.json` redirect silently
 * captured that message, not the report. Fixed to use `--outputFile`
 * explicitly; this test would have caught it, a mocked-exec unit test
 * could not.
 *
 * What this does NOT cover: e2e execution through a real Playwright — this
 * monorepo doesn't install `@playwright/test` (it's the *generated
 * project's* dependency, added to the skeleton, never this repo's).
 * `report.ts`'s Playwright parser is verified against Playwright's
 * documented, stable JSON schema instead (`report.test.ts`), and
 * `run-tests.ts`'s own command construction/parser selection for `"e2e"`
 * is verified with a mocked exec (`run-tests.test.ts`) — genuinely running
 * Playwright remains a manual/production verification step, the same
 * category of gap Gates I-5/I-6 already called out for Docker + `npm
 * install`.
 */

const workspaceRoot = await fs.mkdtemp(join(process.cwd(), "tmp-gate-i7-"));
process.env.KAIROPRO_WORKSPACE_ROOT = workspaceRoot;

const core = await import("@kairopro/core");
const prisma = testDb();

beforeEach(async () => {
  await resetDb(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
  await fs.rm(workspaceRoot, { recursive: true, force: true });
});

let seedCounter = 0;
async function seedProjectWithApprovedSpecs() {
  const email = `ada-gate7-${++seedCounter}@lovelace.dev`;
  const user = await prisma.user.create({
    data: { name: "Ada Lovelace", email },
  });
  const org = await prisma.organization.create({
    data: {
      name: "kairo-gate7",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  const ctx = { userId: user.id, orgId: org.id };
  const project = await core.createProject({ name: "GateApp" }, ctx);
  const workspacePath = join(workspaceRoot, project.id);

  const prd = {
    overview: "A task manager.",
    goals: ["Track tasks to completion"],
    nonGoals: [],
    personas: [{ name: "Member", description: "A regular user" }],
    userStories: [{ persona: "Member", story: "create a task" }],
    assumptions: [],
    businessRules: {
      invariants: ["a task's title is never empty"],
      stateMachine: [
        {
          entity: "Task",
          states: ["open", "done"],
          transitions: [{ from: "open", to: "done", trigger: "complete" }],
        },
      ],
      permissionMatrix: [
        { role: "Manager", entity: "Task", actions: ["delete"] },
      ],
      validationRules: ["title must not be empty"],
      moneyRules: ["N/A — no monetary values"],
      sideEffects: ["none"],
    },
  };
  const appStructure = {
    pages: [{ route: "/tasks", personas: ["Member"] }],
    endpoints: [
      {
        method: "DELETE",
        path: "/api/tasks/:id",
        requestType: "DeleteTaskRequest",
        responseType: "DeleteTaskResponse",
      },
    ],
    components: [{ name: "TaskList", responsibility: "renders the task list" }],
  };

  await prisma.spec.createMany({
    data: [
      {
        projectId: project.id,
        type: "PRD",
        version: 1,
        status: "APPROVED",
        content: prd,
      },
      {
        projectId: project.id,
        type: "DESIGN",
        version: 1,
        status: "APPROVED",
        content: { markdown: "# Design\n" },
      },
      {
        projectId: project.id,
        type: "DATA_MODEL",
        version: 1,
        status: "APPROVED",
        content: {
          schema:
            "model Task { id String @id @default(cuid())\n  title String }",
        },
      },
      {
        projectId: project.id,
        type: "APP_STRUCTURE",
        version: 1,
        status: "APPROVED",
        content: appStructure,
      },
    ],
  });

  return { ctx, project, workspacePath };
}

/** A minimal, dependency-free vitest + tsconfig for the workspace — real
 * `npx vitest`/`npx tsc` resolve both from this repo's own root
 * `node_modules` via ancestor-directory module resolution (the workspace
 * lives under the repo root, not `os.tmpdir()`), verified before relying
 * on it here — no `npm install` needed. */
async function writeMinimalTestProject(workspacePath: string): Promise<void> {
  await fs.mkdir(join(workspacePath, "src/__tests__/unit"), {
    recursive: true,
  });
  await fs.mkdir(join(workspacePath, "src/__tests__/integration"), {
    recursive: true,
  });
  await fs.mkdir(join(workspacePath, "e2e"), { recursive: true });
  await fs.writeFile(
    join(workspacePath, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        types: [],
      },
      include: ["src/__tests__/**/*.ts", "e2e/**/*.ts"],
    }),
    "utf8",
  );
  await fs.writeFile(
    join(workspacePath, "vitest.config.ts"),
    [
      'import { defineConfig } from "vitest/config";',
      "export default defineConfig({",
      '  test: { environment: "node", include: ["src/__tests__/**/*.test.ts"] },',
      "});",
    ].join("\n"),
    "utf8",
  );
}

/** Responds with each of `contents` in order, then repeats the last —
 * every call in this file happens strictly sequentially. */
function fakeProvider(...contents: string[]): LLMProvider {
  let call = 0;
  const complete = vi.fn().mockImplementation(async () => {
    const content = contents[Math.min(call, contents.length - 1)]!;
    call += 1;
    return {
      content,
      usage: { inputTokens: 1, outputTokens: 1 },
      stopReason: "end_turn" as const,
    };
  });
  return { name: "fake", complete, stream: vi.fn() };
}

describe("Integration Gate I-7: independent verification works end to end", () => {
  it("the test agent's context excludes the implementation, covers all three levels, and the permission matrix produces a negative test per pair", async () => {
    const { ctx, project, workspacePath } =
      await seedProjectWithApprovedSpecs();
    await core.getWorkspaceStore().allocate(project.id);
    await writeMinimalTestProject(workspacePath);

    // A real implementation file, sitting right there in the workspace,
    // with a distinctive marker — item 1 is that this never reaches the
    // model despite being fully available to read.
    const IMPLEMENTATION_SENTINEL = "SECRET_DELETE_TASK_IMPLEMENTATION_DETAIL";
    await fs.writeFile(
      join(workspacePath, "src", "app-api-tasks-route.ts"),
      `// ${IMPLEMENTATION_SENTINEL}\nexport function DELETE() { /* ... */ }`,
    );

    const runtime = core.getContainerRuntime();
    const passingUnitTest =
      'import { describe, expect, it } from "vitest";\n' +
      'describe("x", () => { it("passes", () => { expect(true).toBe(true); }); });\n';

    const provider = fakeProvider(passingUnitTest); // reused for every case

    const result = await core.runTestAuthoringPhase({
      projectId: project.id,
      ctx,
      workspace: core.getWorkspaceStore(),
      runtime,
      containerId: "irrelevant-for-stub",
      cwd: workspacePath,
      template: core.loadTemplate("nextjs-shadcn"),
      specs: await core.loadApprovedSpecs(project.id, ctx),
      contractsContent:
        "export interface DeleteTaskRequest {}\nexport interface DeleteTaskResponse {}",
      provider,
    });

    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;

    // Item 2: unit, integration, and e2e levels are all represented.
    const levels = new Set(result.testCases.map((c) => c.level));
    expect(levels).toEqual(new Set(["unit", "integration", "e2e"]));

    // Item 3: the one (role, entity, action) triple in the matrix
    // produced exactly one negative permission test.
    const permissionCases = result.testCases.filter(
      (c) => c.source === "permission",
    );
    expect(permissionCases).toHaveLength(1);
    expect(permissionCases[0]!.description).toContain("not-Manager");

    // Item 1, proven for real: the sentinel from the implementation file
    // sitting in the workspace never reached any prompt the fake
    // provider received, across every one of the generated files.
    const completeMock = vi.mocked(provider.complete);
    const allPromptText = completeMock.mock.calls
      .map((call) => {
        const input = call[0] as { messages: { content: string }[] };
        return input.messages.map((m) => m.content).join("\n");
      })
      .join("\n---\n");
    expect(allPromptText).not.toContain(IMPLEMENTATION_SENTINEL);
    expect(completeMock).toHaveBeenCalledTimes(result.testCases.length);
  }, 30_000);

  it("tests execute in the project container and results parse correctly, and a failing test feeds the fix loop with the assertion text", async () => {
    const { ctx, project, workspacePath } =
      await seedProjectWithApprovedSpecs();
    await core.getWorkspaceStore().allocate(project.id);
    await writeMinimalTestProject(workspacePath);
    const runtime = core.getContainerRuntime();

    // Write the tests by hand this time — this test is about *running*
    // them for real, not authoring them (the previous test already
    // covers authoring).
    await fs.writeFile(
      join(workspacePath, "src/__tests__/unit/passing.test.ts"),
      'import { describe, expect, it } from "vitest";\n' +
        'describe("x", () => { it("passes", () => { expect(1 + 1).toBe(2); }); });\n',
    );
    await fs.writeFile(
      join(
        workspacePath,
        "src/__tests__/integration/permission-manager-task-delete.test.ts",
      ),
      "// @implementation: src/app-api-tasks-route.ts\n" +
        'import { describe, expect, it } from "vitest";\n' +
        'describe("permission", () => {\n' +
        '  it("forbids a non-Manager from deleting a task", () => {\n' +
        "    const actuallyForbidden = false; // deliberately wrong, to prove item 5 for real\n" +
        "    expect(actuallyForbidden).toBe(true);\n" +
        "  });\n" +
        "});\n",
    );

    const unitReport = await core.runTestSuite({
      runtime,
      containerId: "c1",
      cwd: workspacePath,
      level: "unit",
    });
    expect(unitReport).toMatchObject({ total: 1, passed: 1, failed: 0 });

    const integrationReport = await core.runTestSuite({
      runtime,
      containerId: "c1",
      cwd: workspacePath,
      level: "integration",
    });
    expect(integrationReport.total).toBe(1);
    expect(integrationReport.failed).toBe(1);
    const failure = integrationReport.results[0]!;
    expect(failure.status).toBe("failed");
    expect(failure.message).toMatch(/expected false to be true/i);

    // Item 5: the real failing assertion text is what the repair prompt
    // sees — not a bare exit code.
    const fixProvider = fakeProvider(
      "export function fixedImplementation() { /* enforces the check now */ }",
    );
    const repairOutcome = await core.repairFromTestFailure({
      implementationPath: "src/app-api-tasks-route.ts",
      concern: "authorization",
      failingAssertion: failure.message!,
      conventions: "conv",
      specs: "specs",
      projectId: project.id,
      ctx,
      workspace: core.getWorkspaceStore(),
      runtime,
      containerId: "c1",
      cwd: workspacePath,
      provider: fixProvider,
    });

    expect(repairOutcome.status).toBe("fixed");
    const fixCall = vi.mocked(fixProvider.complete).mock.calls[0]![0] as {
      messages: { content: string }[];
    };
    const promptText = fixCall.messages.map((m) => m.content).join("\n");
    expect(promptText).toContain("expected false to be true");

    // The repair wrote to the implementation, never the test file.
    const testFileStillOriginal = await fs.readFile(
      join(
        workspacePath,
        "src/__tests__/integration/permission-manager-task-delete.test.ts",
      ),
      "utf8",
    );
    expect(testFileStillOriginal).toContain("actuallyForbidden = false");
  }, 30_000);

  it("an attempted test modification is rejected and logged as a real InternalError row, except a documented spec-contradiction override", async () => {
    const { ctx, project, workspacePath } =
      await seedProjectWithApprovedSpecs();
    await core.getWorkspaceStore().allocate(project.id);
    await writeMinimalTestProject(workspacePath);
    const runtime = core.getContainerRuntime();
    const testPath = "src/__tests__/unit/some.test.ts";

    const rejected = await core.repairFromTestFailure({
      implementationPath: testPath,
      concern: "other",
      failingAssertion: "some assertion failed",
      conventions: "conv",
      specs: "specs",
      projectId: project.id,
      ctx,
      workspace: core.getWorkspaceStore(),
      runtime,
      containerId: "c1",
      cwd: workspacePath,
      provider: fakeProvider("should never be called"),
    });

    expect(rejected).toEqual({
      status: "rejected",
      reason: "test-modification-not-allowed",
    });
    const rejectionRows = await prisma.internalError.findMany({
      where: { step: testPath },
    });
    expect(rejectionRows).toHaveLength(1);
    expect(rejectionRows[0]!.resolution).toBe("rejected:test-modification");
    expect(rejectionRows[0]!.resolved).toBe(false);

    const overrideProvider = fakeProvider(
      'import { describe, expect, it } from "vitest";\n' +
        'describe("corrected", () => { it("now correct", () => { expect(true).toBe(true); }); });\n',
    );
    const overridden = await core.repairFromTestFailure({
      implementationPath: testPath,
      concern: "other",
      failingAssertion: "the test contradicted the approved PRD",
      conventions: "conv",
      specs: "specs",
      projectId: project.id,
      ctx,
      workspace: core.getWorkspaceStore(),
      runtime,
      containerId: "c1",
      cwd: workspacePath,
      provider: overrideProvider,
      allowSpecContradiction: true,
    });

    expect(overridden.status).toBe("fixed");
    expect(overrideProvider.complete).toHaveBeenCalledTimes(1);
    const overrideRows = await prisma.internalError.findMany({
      where: { step: testPath, resolution: "spec-contradiction-override" },
    });
    expect(overrideRows).toHaveLength(1);
    expect(overrideRows[0]!.resolved).toBe(true);
  }, 30_000);
});

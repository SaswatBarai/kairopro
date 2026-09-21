import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetDb, testDb } from "./helpers";

// The workspace root must be pinned before the core singleton resolves it —
// same pattern as project-lifecycle.test.ts. NODE_ENV is "test" here (the
// vitest default), so `getContainerRuntime()` resolves to the unisolated
// StubContainerRuntime — real end-to-end exercise of the build pipeline
// without needing a Docker daemon in CI.
const workspaceRoot = mkdtempSync(join(tmpdir(), "kairopro-it-build-"));
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
  const email = `ada-build-${++seedCounter}@lovelace.dev`;
  const user = await prisma.user.create({
    data: { name: "Ada Lovelace", email },
  });
  const org = await prisma.organization.create({
    data: {
      name: "kairo-build",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  return { user, org, ctx: { userId: user.id, orgId: org.id } };
}

/** Waits for the *background* workflow to actually finish, not just for
 * `status` to look terminal — `cancelBuild` flips `status` to CANCELLED
 * synchronously, before the in-flight `executeBuild` has caught up and
 * wrapped up (checkpoint, `finishedAt`). Only `finishedAt` being set means
 * the background task is done and it's safe for the next test's `resetDb`
 * to delete these rows without racing it. */
async function waitForTerminal(
  buildId: string,
  ctx: { userId: string; orgId: string },
  timeoutMs = 15_000,
) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const build = await core.getBuild(buildId, ctx);
    if (
      build.status !== "QUEUED" &&
      build.status !== "RUNNING" &&
      build.finishedAt
    ) {
      return build;
    }
    if (Date.now() > deadline) {
      throw new Error(
        `build ${buildId} did not reach a terminal state within ${timeoutMs}ms (still ${build.status})`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

describe("build workflow (Phase 15 / BE-10, real DB + stub runtime)", () => {
  it("start → provision → generate (fails fast: no approved specs, Phase 16's real gate) — FAILED, with gap-free, duplicate-free logs", async () => {
    const { ctx } = await seedOrgWithOwner();
    const project = await core.createProject({ name: "BuildableApp" }, ctx);

    const started = await core.startBuild(project.id, ctx);
    expect(started.status).toBe("QUEUED");

    // No spec has been approved for this project, so the real "generate"
    // step (Phase 16 / AI-6) refuses before writing a single file — code
    // generation is gated on approved specs, not best-effort. This is the
    // real, current behavior, not a stand-in for a slower happy path:
    // exercising that path for real needs a real LLM and `npm install`,
    // which `tests/integration/gate-i5-i6.test.ts` covers directly
    // instead, against a fake provider and a scoped fixture.
    const finished = await waitForTerminal(started.id, ctx);
    expect(finished.status).toBe("FAILED");

    const errors = await prisma.internalError.findMany({
      where: { buildId: started.id },
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.message).toMatch(/approved first/i);

    const logs = await prisma.buildLog.findMany({
      where: { buildId: started.id },
      orderBy: { seq: "asc" },
    });
    expect(logs.length).toBeGreaterThan(0);
    const seqs = logs.map((l) => l.seq);
    expect(seqs).toEqual(seqs.map((_, i) => i)); // 0..n-1, no gaps, no duplicates
    expect(logs.some((l) => l.type === "EVENT")).toBe(true);

    // User-safe only — no internal detail reaches the client-facing log.
    const errorEvent = logs.find(
      (l) => l.type === "EVENT" && l.content.includes('"event":"error"'),
    );
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.content).not.toMatch(/approved first/i);
  }, 20_000);

  it("refuses a second build while one is already active for the project", async () => {
    const { ctx } = await seedOrgWithOwner();
    const project = await core.createProject({ name: "OneAtATime" }, ctx);

    const first = await core.startBuild(project.id, ctx);
    await expect(core.startBuild(project.id, ctx)).rejects.toThrow(
      /already running/i,
    );

    await waitForTerminal(first.id, ctx);

    // Once the first build is terminal, starting a new one is fine again.
    const second = await core.startBuild(project.id, ctx);
    expect(second.status).toBe("QUEUED");
    await waitForTerminal(second.id, ctx);
  }, 20_000);

  it("cancel is idempotent — a second call returns the same terminal state as the first", async () => {
    const { ctx } = await seedOrgWithOwner();
    const project = await core.createProject({ name: "CancelApp" }, ctx);
    const started = await core.startBuild(project.id, ctx);

    const first = await core.cancelBuild(started.id, ctx);
    const second = await core.cancelBuild(started.id, ctx);

    expect(second.status).toBe(first.status);
    expect(second.id).toBe(first.id);

    await waitForTerminal(started.id, ctx);
  }, 20_000);
});

describe("logs (Phase 15 / BE-10, real DB constraint)", () => {
  it("two concurrent appendLog calls each get a distinct seq — no duplicate escapes", async () => {
    const { ctx } = await seedOrgWithOwner();
    const project = await core.createProject({ name: "ConcurrentLogs" }, ctx);
    const build = await prisma.build.create({
      data: { projectId: project.id },
    });

    const [a, b] = await Promise.all([
      core.appendLog(build.id, "STDOUT", "line-a"),
      core.appendLog(build.id, "STDOUT", "line-b"),
    ]);

    expect(new Set([a.seq, b.seq]).size).toBe(2);
    expect([a.seq, b.seq].sort((x, y) => x - y)).toEqual([0, 1]);

    const rows = await prisma.buildLog.findMany({
      where: { buildId: build.id },
    });
    expect(rows).toHaveLength(2);

    // A subsequent write still gets the next free seq.
    const c = await core.appendLog(build.id, "STDOUT", "line-c");
    expect(c.seq).toBe(2);
  });
});

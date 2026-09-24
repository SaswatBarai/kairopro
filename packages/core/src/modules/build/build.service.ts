import type { Build, BuildList } from "@kairopro/contracts";
import type { Prisma, Project as ProjectRow } from "@kairopro/db";
import type { RequestContext } from "../../lib/context";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { getContainerRuntime } from "../../platform/container";
import { logger, withCorrelation } from "../../platform/logger";
import { getWorkspaceStore } from "../../platform/workspace";
import { runBackendPhase } from "../agent/phases/backend";
import { runFrontendPhase } from "../agent/phases/frontend";
import { runTestAuthoringPhase } from "../agent/phases/test-authoring";
import type { DegradationLevel } from "../agent/recovery/degradation";
import {
  loadTemplate,
  renderConventions,
  type TemplateManifest,
} from "../agent/template";
import { scaffoldProject } from "../agent/workflow/steps/scaffold";
import {
  loadApprovedSpecs,
  renderSpecsForPrompt,
  type ApprovedSpecs,
} from "../agent/workflow/steps/generation-context";
import { runTestPhase } from "../agent/workflow/steps/run-tests";
import { ownerOf } from "../org/access";
import { touchProjectActivity } from "../project/project.repository";
import { recordVersion } from "../version/version.service";
import { emit as emitUsage } from "../usage/usage.service";
import {
  createBuildRow,
  createInternalErrorRow,
  findActiveBuild,
  findBuildById,
  findBuildWithProject,
  listBuildsByProject,
  updateBuildRow,
  type BuildRow,
} from "./build.repository";
import { encodeEventContent } from "./sse/encode";
import { ensureAppDatabase } from "../../platform/app-database";
import { createCodeStream } from "./code-stream";
import { emitLog } from "./logs";
import { runWorkflow, type BuildStep, type BuildStepContext } from "./workflow";

/**
 * Build orchestration (Phase 15 / BE-10): start, cancel, status. Starting a
 * build returns immediately — `executeBuild` runs unawaited and drives the
 * workflow to completion in the background, in this same long-lived Node
 * process (there is no separate worker/queue in V1).
 */

const APP_RUNTIME_IMAGE = "kairopro-app-runtime:local";

function toBuild(row: BuildRow): Build {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status,
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    commitHash: row.commitHash,
    previewUrl: row.previewUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

async function requireProjectAccess(
  projectId: string,
  ctx: RequestContext,
): Promise<ProjectRow> {
  const project = await ownerOf(projectId, ctx);
  if (!project) throw new NotFoundError({ message: "Project not found" });
  return project;
}

async function requireBuildAccess(
  buildId: string,
  ctx: RequestContext,
): Promise<BuildRow> {
  const row = await findBuildWithProject(buildId);
  if (!row) throw new NotFoundError({ message: "Build not found" });
  const project = await ownerOf(row.projectId, ctx);
  if (!project) {
    // Exists, but not in the caller's org — 404, never 403 (no leaking
    // cross-tenant existence), same rule as every other access guard.
    throw new NotFoundError({ message: "Build not found" });
  }
  return row;
}

export async function startBuild(
  projectId: string,
  ctx: RequestContext,
): Promise<Build> {
  const project = await requireProjectAccess(projectId, ctx);

  const active = await findActiveBuild(projectId);
  if (active) {
    throw new ConflictError({
      message: "A build is already running for this project",
      details: { buildId: active.id },
    });
  }

  const row = await createBuildRow(projectId);
  await touchProjectActivity(projectId);
  void executeBuild(row.id, project, ctx).catch((cause) => {
    // executeBuild already turns every failure it can see into a FAILED
    // build + InternalError row; this only catches a crash outside that
    // handling (e.g. the DB itself is unreachable).
    logger.error(
      { err: cause, buildId: row.id, projectId },
      "build.executeBuild crashed outside its own error handling",
    );
  });

  return toBuild(row);
}

export async function cancelBuild(
  buildId: string,
  ctx: RequestContext,
): Promise<Build> {
  const row = await requireBuildAccess(buildId, ctx);

  // Idempotent: a build that is already terminal (including already
  // CANCELLED) is a no-op, not an error — a second call returns the same
  // state instead of failing.
  if (row.status !== "QUEUED" && row.status !== "RUNNING") {
    return toBuild(row);
  }

  const updated = await updateBuildRow(buildId, { status: "CANCELLED" });
  return toBuild(updated);
}

export async function getBuild(
  buildId: string,
  ctx: RequestContext,
): Promise<Build> {
  const row = await requireBuildAccess(buildId, ctx);
  return toBuild(row);
}

export async function listBuilds(
  projectId: string,
  ctx: RequestContext,
): Promise<BuildList> {
  await requireProjectAccess(projectId, ctx);
  const rows = await listBuildsByProject(projectId);
  return rows.map(toBuild);
}

function makeCheckCancelled(buildId: string): () => Promise<boolean> {
  return async () => {
    const row = await findBuildById(buildId);
    return row?.status === "CANCELLED";
  };
}

function makeOnDegrade(
  buildId: string,
): (unit: string, step: { level: DegradationLevel; message: string }) => void {
  return (unit, step) => {
    void emitLog(
      buildId,
      "EVENT",
      encodeEventContent({
        event: "code",
        data: { unit, level: step.level, message: step.message },
      }),
    );
  };
}

/** Exported only for tests to exercise a single step's body directly —
 * every `executeBuild` test drives `runWorkflow` mocked wholesale instead,
 * which never calls into these closures. Not part of the public API. */
export function buildSteps(
  runtime: ReturnType<typeof getContainerRuntime>,
  project: ProjectRow,
): BuildStep[] {
  return [
    {
      name: "provision",
      async run({ buildId, state }) {
        // The project's own database — its migration and tests run against
        // this, never the platform's `DATABASE_URL`.
        const databaseUrl = await ensureAppDatabase(project.id);
        const container = await runtime.provision({
          projectId: project.id,
          image: APP_RUNTIME_IMAGE,
          env: { DATABASE_URL: databaseUrl },
        });
        state.containerId = container.containerId;
        await updateBuildRow(buildId, {
          previewUrl: container.previewUrl || null,
        });
        await touchProjectActivity(project.id);
        await emitLog(
          buildId,
          "STDOUT",
          `Provisioned container ${container.containerId}`,
        );
      },
    },
    {
      name: "generate",
      // scaffold → backend phase (schema/migrate/contracts/routes) →
      // frontend phase (pages/auth) (Phase 16 / AI-6), each file repaired
      // by the fix loop and gated by the degradation policy (Phase 17 /
      // AI-7). File-boundary cancellation is checked by re-reading the
      // Build row directly — finer-grained than `runWorkflow`'s own
      // between-*step* check, which only sees "generate" as one unit.
      //
      // If a phase reports itself cancelled mid-run, this returns without
      // throwing rather than signaling anything special: the Build row's
      // status is already CANCELLED at that point, so `runWorkflow`'s own
      // check before the next step ("checkpoint") sees it and finishes the
      // build as cancelled — no separate plumbing needed here.
      async run({ buildId, projectId, ctx: stepCtx, state }) {
        const containerId = state.containerId as string;
        const workspaceStore = getWorkspaceStore();
        const workspacePath = await workspaceStore.resolve(projectId, ".");

        const scaffolded = await scaffoldProject({
          workspacePath,
          templateId: project.templateId,
        });
        await emitLog(
          buildId,
          "STDOUT",
          `Scaffolded ${scaffolded.templateId} (${scaffolded.filesCopied.length} files)`,
        );

        const template = loadTemplate(project.templateId);
        const specs = await loadApprovedSpecs(projectId, stepCtx);
        state.template = template;
        state.specs = specs;
        state.workspacePath = workspacePath;

        const checkCancelled = makeCheckCancelled(buildId);
        const onDegrade = makeOnDegrade(buildId);
        const codeStream = createCodeStream(buildId);

        let backendResult: Awaited<ReturnType<typeof runBackendPhase>>;
        let frontendResult: Awaited<ReturnType<typeof runFrontendPhase>>;
        try {
          backendResult = await runBackendPhase({
            projectId,
            buildId,
            ctx: stepCtx,
            workspace: workspaceStore,
            runtime,
            containerId,
            cwd: workspacePath,
            template,
            specs,
            checkCancelled,
            onDegrade,
            onCode: codeStream.onCode,
          });
          if (backendResult.status === "cancelled") return;

          frontendResult = await runFrontendPhase({
            projectId,
            buildId,
            ctx: stepCtx,
            workspace: workspaceStore,
            runtime,
            containerId,
            cwd: workspacePath,
            template,
            specs,
            checkCancelled,
            onDegrade,
            onCode: codeStream.onCode,
          });
          if (frontendResult.status === "cancelled") return;
        } finally {
          await codeStream.drain();
        }

        const filesGenerated = [
          ...backendResult.filesGenerated,
          ...frontendResult.filesGenerated,
        ];
        const omitted = [...backendResult.omitted, ...frontendResult.omitted];
        await emitLog(
          buildId,
          "STDOUT",
          `Generated ${filesGenerated.length} file(s)` +
            (omitted.length > 0
              ? `, omitted ${omitted.length}: ${omitted.join(", ")}`
              : ""),
        );
      },
    },
    {
      name: "test",
      // test-authoring (Phase 18 / AI-8): writes unit/integration/e2e
      // tests from the specs and frozen contracts alone — never the
      // implementation, see `phases/test-authoring.ts`'s own module doc —
      // runs them in the project container, and repairs a failing test's
      // *implementation*, never the test, using the failing assertion.
      // Unresolved failures throw `UnresolvedTestFailuresError`, caught by
      // this function's own outer try/catch below like any other step
      // failure — "unresolved failures do not silently proceed" is just
      // this step raising like every other one, not a special case.
      async run({ buildId, projectId, ctx: stepCtx, state }) {
        const containerId = state.containerId as string;
        const workspaceStore = getWorkspaceStore();
        const template = state.template as TemplateManifest;
        const specs = state.specs as ApprovedSpecs;
        const workspacePath = state.workspacePath as string;

        const checkCancelled = makeCheckCancelled(buildId);
        const onDegrade = makeOnDegrade(buildId);

        const contractsContent = await workspaceStore.readFile(
          projectId,
          template.conventions.contractsPath,
        );

        const codeStream = createCodeStream(buildId);
        let authoringResult: Awaited<ReturnType<typeof runTestAuthoringPhase>>;
        try {
          authoringResult = await runTestAuthoringPhase({
            projectId,
            buildId,
            ctx: stepCtx,
            workspace: workspaceStore,
            runtime,
            containerId,
            cwd: workspacePath,
            template,
            specs,
            contractsContent,
            checkCancelled,
            onDegrade,
            onCode: codeStream.onCode,
          });
        } finally {
          await codeStream.drain();
        }
        if (authoringResult.status === "cancelled") return;

        await emitLog(
          buildId,
          "STDOUT",
          `Authored ${authoringResult.filesGenerated.length} test(s)` +
            (authoringResult.omitted.length > 0
              ? `, omitted ${authoringResult.omitted.length}`
              : ""),
        );

        const conventions = renderConventions(template);
        const specsText = renderSpecsForPrompt(specs);

        const testPhaseResult = await runTestPhase({
          projectId,
          buildId,
          ctx: stepCtx,
          workspace: workspaceStore,
          runtime,
          containerId,
          cwd: workspacePath,
          conventions,
          specs: specsText,
          testCases: authoringResult.testCases,
          checkCancelled,
          onRepair: (file, outcome) => {
            void emitLog(
              buildId,
              "EVENT",
              encodeEventContent({
                event: "code",
                data: { unit: file, repair: outcome.status },
              }),
            );
          },
        });
        if (testPhaseResult.status === "cancelled") return;

        const totals = Object.values(testPhaseResult.reports).reduce(
          (acc, report) => ({
            total: acc.total + report.total,
            passed: acc.passed + report.passed,
          }),
          { total: 0, passed: 0 },
        );
        await emitLog(
          buildId,
          "STDOUT",
          `Tests green: ${totals.passed}/${totals.total}`,
        );
      },
    },
    {
      name: "checkpoint",
      async run({ buildId, ctx: stepCtx }) {
        if (!project.workspacePath) return;
        const version = await recordVersion(
          project.id,
          project.workspacePath,
          `Build ${buildId}`,
          stepCtx,
        );
        await updateBuildRow(buildId, { commitHash: version.hash });
      },
    },
  ];
}

async function checkpointCancelled(
  stepCtx: BuildStepContext,
  nextStepName: string,
  project: ProjectRow,
): Promise<void> {
  if (!project.workspacePath) return;
  try {
    const version = await recordVersion(
      project.id,
      project.workspacePath,
      `Checkpoint: cancelled during ${nextStepName}`,
      stepCtx.ctx,
    );
    await updateBuildRow(stepCtx.buildId, { commitHash: version.hash });
  } catch (cause) {
    // Best-effort: the build's DB status is already CANCELLED regardless
    // of whether a checkpoint commit could be made (e.g. a dirty tree from
    // a step that was interrupted mid-write is itself the failure mode
    // this is meant to protect against, not something to fail loudly on).
    logger.warn(
      { err: cause, buildId: stepCtx.buildId },
      "checkpoint commit failed after cancel",
    );
  }
}

function serializeError(cause: unknown): Prisma.InputJsonValue {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack ?? null,
    };
  }
  return { value: String(cause) };
}

/** Exported only for tests to await directly — `startBuild` itself never
 * awaits this; it runs in the background. Not part of the package's public
 * API (not re-exported from index.ts). */
export async function executeBuild(
  buildId: string,
  project: ProjectRow,
  ctx: RequestContext,
): Promise<void> {
  const log = withCorrelation(logger, { projectId: project.id, buildId });
  await updateBuildRow(buildId, { status: "RUNNING", startedAt: new Date() });

  const runtime = getContainerRuntime();
  const steps = buildSteps(runtime, project);

  try {
    const outcome = await runWorkflow({
      buildId,
      projectId: project.id,
      ctx,
      steps,
      onCancelled: (stepCtx, nextStepName) =>
        checkpointCancelled(stepCtx, nextStepName, project),
    });

    if (outcome === "cancelled") {
      await updateBuildRow(buildId, { finishedAt: new Date() });
      await emitLog(
        buildId,
        "EVENT",
        encodeEventContent({ event: "done", data: { status: "CANCELLED" } }),
      );
      return;
    }

    await updateBuildRow(buildId, {
      status: "SUCCEEDED",
      finishedAt: new Date(),
    });
    await emitUsage("BUILD", 1, ctx, { projectId: project.id, buildId });
    await emitLog(
      buildId,
      "EVENT",
      encodeEventContent({ event: "done", data: { status: "SUCCEEDED" } }),
    );
  } catch (cause) {
    log.error({ err: cause }, "build failed");
    await createInternalErrorRow({
      buildId,
      step: "build",
      errorType:
        cause instanceof Error ? cause.constructor.name : "UnknownError",
      message: cause instanceof Error ? cause.message : String(cause),
      detail: serializeError(cause),
    }).catch((writeCause) => {
      log.error({ err: writeCause }, "failed to write InternalError row");
    });
    await updateBuildRow(buildId, { status: "FAILED", finishedAt: new Date() });
    // User-safe only — no message, stack, or container output from `cause`
    // ever reaches the client; the full context is in the InternalError row.
    await emitLog(
      buildId,
      "EVENT",
      encodeEventContent({
        event: "error",
        data: { message: "The build failed. Check the logs for details." },
      }),
    );
  }
}

import type { Build, BuildList } from "@kairopro/contracts";
import type { Prisma, Project as ProjectRow } from "@kairopro/db";
import type { RequestContext } from "../../lib/context";
import { ConflictError, NotFoundError, ProviderError } from "../../lib/errors";
import { getContainerRuntime } from "../../platform/container";
import { logger, withCorrelation } from "../../platform/logger";
import { ownerOf } from "../org/access";
import { recordVersion } from "../version/version.service";
import { emit as emitUsage } from "../usage/usage.service";
import {
  createBuildRow,
  createInternalErrorRow,
  findActiveBuild,
  findBuildWithProject,
  listBuildsByProject,
  updateBuildRow,
  type BuildRow,
} from "./build.repository";
import { encodeEventContent } from "./sse/encode";
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

function buildSteps(
  runtime: ReturnType<typeof getContainerRuntime>,
  project: ProjectRow,
): BuildStep[] {
  return [
    {
      name: "provision",
      async run({ buildId, state }) {
        const container = await runtime.provision({
          projectId: project.id,
          image: APP_RUNTIME_IMAGE,
        });
        state.containerId = container.containerId;
        await updateBuildRow(buildId, {
          previewUrl: container.previewUrl || null,
        });
        await emitLog(
          buildId,
          "STDOUT",
          `Provisioned container ${container.containerId}`,
        );
      },
    },
    {
      name: "generate",
      // A placeholder that proves the exec → stream → SSE pipeline works
      // end to end. Phase 16 (AI-6) replaces this step with real
      // scaffold/freeze-contracts/generate-code steps — the workflow driver
      // above does not change when that happens.
      async run({ buildId, state }) {
        const containerId = state.containerId as string;
        const result = await runtime.execStream(
          {
            containerId,
            cmd: "echo 'Code generation lands in Phase 16 (AI-6).'",
          },
          (line) => {
            void emitLog(buildId, "STDOUT", line);
          },
        );
        if (result.exitCode !== 0) {
          throw new ProviderError({
            message: "Build command failed",
            details: { exitCode: result.exitCode, stderr: result.stderr },
          });
        }
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
    return { name: cause.name, message: cause.message, stack: cause.stack ?? null };
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

    await updateBuildRow(buildId, { status: "SUCCEEDED", finishedAt: new Date() });
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
      errorType: cause instanceof Error ? cause.constructor.name : "UnknownError",
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

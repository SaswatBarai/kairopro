import type {
  ChangePlan,
  ChangeRequest,
  ChangeRequestList,
  RequestChangeInput,
} from "@kairopro/contracts";
import { ChangePlanSchema } from "@kairopro/contracts";
import type { Prisma, Project as ProjectRow } from "@kairopro/db";
import type { RequestContext } from "../../../../lib/context";
import { ConflictError, NotFoundError } from "../../../../lib/errors";
import { getContainerRuntime } from "../../../../platform/container";
import { logger } from "../../../../platform/logger";
import { getWorkspaceStore } from "../../../../platform/workspace";
import { createInternalErrorRow } from "../../../build/build.repository";
import { ownerOf } from "../../../org/access";
import { discardUncommittedChanges } from "../../../version/git.service";
import { recordVersion } from "../../../version/version.service";
import {
  createChangeRequestRow,
  findChangeRequestById,
  findChangeRequestWithProject,
  listChangeRequestsByProject,
  updateChangeRequestRow,
  type ChangeRequestRow,
} from "../../change/change.repository";
import { buildChangeSummary } from "../../context/change-summary";
import { retrieve } from "../../context/retrieve";
import { getLLMProvider } from "../../llm";
import { modelFor } from "../../llm/router";
import { completeStructured } from "../../llm/structured";
import { renderPrompt } from "../../prompts/loader";
import type { ConcernCategory } from "../../recovery/rules";
import { loadApprovedSpecs, renderSpecsForPrompt } from "./generation-context";
import { deriveTestCases } from "../../phases/test-authoring";
import { loadTemplate, renderConventions } from "../../template";
import { generateFile } from "./generate-code";
import { freezeContracts } from "./freeze-contracts";
import { runTestPhase } from "./run-tests";

/**
 * Change requests (Phase 20 / AI-9): modify an existing, already-built
 * project without breaking what already works. Two phases, each awaited
 * separately by the caller so the plan can be reviewed before anything is
 * touched: `requestChange` produces a plan (`planChangeRequest`, run in the
 * background); `approveChangeRequest` applies it (`executeChangeRequest`,
 * also backgrounded). Nothing under `executeChangeRequest` is committed
 * until every check — per-file typecheck, contract drift, regression
 * tests — has passed; a failure or cancellation at any point discards
 * whatever was written via `discardUncommittedChanges`, so the workspace
 * is either fully updated by one commit or exactly as it was before.
 *
 * This deliberately does not run through `build/workflow.ts`'s
 * `runWorkflow`/`BuildStep` — those are coupled to the `Build` row's own
 * status for cancellation, and a change request is not a build. It follows
 * `startBuild`/`executeBuild`'s shape instead: create a row, return
 * immediately, run the rest unawaited.
 */

const APP_RUNTIME_IMAGE = "kairopro-app-runtime:local";

function toChangeRequest(row: ChangeRequestRow): ChangeRequest {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status,
    request: row.request,
    plan: (row.plan as unknown as ChangePlan | null) ?? null,
    commitHash: row.commitHash,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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

async function requireChangeRequestAccess(
  changeRequestId: string,
  ctx: RequestContext,
): Promise<ChangeRequestRow> {
  const row = await findChangeRequestWithProject(changeRequestId);
  if (!row) throw new NotFoundError({ message: "Change request not found" });
  const project = await ownerOf(row.projectId, ctx);
  if (!project) {
    throw new NotFoundError({ message: "Change request not found" });
  }
  return row;
}

async function isCancelled(changeRequestId: string): Promise<boolean> {
  const row = await findChangeRequestById(changeRequestId);
  return row?.status === "CANCELLED";
}

async function failChangeRequest(
  changeRequestId: string,
  step: string,
  cause: unknown,
): Promise<void> {
  const message = cause instanceof Error ? cause.message : String(cause);
  await createInternalErrorRow({
    buildId: null,
    step: `change-request:${step}`,
    errorType: "change-request-failed",
    message,
    detail: { changeRequestId },
    resolved: false,
  }).catch(() => undefined);
  await updateChangeRequestRow(changeRequestId, {
    status: "FAILED",
    finishedAt: new Date(),
  }).catch(() => undefined);
}

/** Tags a change's file — never inferred by the LLM (same rule Phase 16
 * established: `recovery/rules.ts` decides degradability from the tag, so
 * the tag itself must come from something predictable, not the model's own
 * self-assessment). Generous on purpose: a false positive here only costs
 * extra fix-loop retries; a false negative could let a sensitive change be
 * silently simplified away. */
function concernForChangeTask(path: string, task: string): ConcernCategory {
  const text = `${path} ${task}`.toLowerCase();
  if (/permission|role|authoriz|access.?control/.test(text)) {
    return "authorization";
  }
  if (/tenant|cross-org|org.?id|isolation/.test(text)) {
    return "tenant-isolation";
  }
  if (/money|price|payment|amount|balance|invoice|currency/.test(text)) {
    return "money-handling";
  }
  if (/invariant|state.?machine|audit/.test(text)) return "data-invariants";
  if (/\.css$/.test(path) || /\bstyle/.test(text)) return "styling";
  if (/\bcopy\b|\bcontent\b/.test(text)) return "copy";
  return "other";
}

export async function requestChange(
  projectId: string,
  input: RequestChangeInput,
  ctx: RequestContext,
): Promise<ChangeRequest> {
  const project = await requireProjectAccess(projectId, ctx);
  const row = await createChangeRequestRow(projectId, input.request);

  void planChangeRequest(row.id, project, ctx).catch((cause) => {
    logger.error(
      { err: cause, changeRequestId: row.id, projectId },
      "change-request planning crashed outside its own error handling",
    );
  });

  return toChangeRequest(row);
}

export async function getChangeRequest(
  changeRequestId: string,
  ctx: RequestContext,
): Promise<ChangeRequest> {
  const row = await requireChangeRequestAccess(changeRequestId, ctx);
  return toChangeRequest(row);
}

export async function listChangeRequests(
  projectId: string,
  ctx: RequestContext,
): Promise<ChangeRequestList> {
  await requireProjectAccess(projectId, ctx);
  const rows = await listChangeRequestsByProject(projectId);
  return rows.map(toChangeRequest);
}

export async function approveChangeRequest(
  changeRequestId: string,
  ctx: RequestContext,
): Promise<ChangeRequest> {
  const row = await requireChangeRequestAccess(changeRequestId, ctx);
  if (row.status !== "AWAITING_APPROVAL") {
    throw new ConflictError({
      message: "This change request is not awaiting approval",
      details: { status: row.status },
    });
  }

  const project = await requireProjectAccess(row.projectId, ctx);
  const updated = await updateChangeRequestRow(changeRequestId, {
    status: "APPLYING",
    startedAt: new Date(),
  });

  void executeChangeRequest(changeRequestId, project, ctx).catch((cause) => {
    logger.error(
      { err: cause, changeRequestId, projectId: row.projectId },
      "change-request apply crashed outside its own error handling",
    );
  });

  return toChangeRequest(updated);
}

/** Idempotent, like `cancelBuild`: cancelling an already-terminal change
 * request is a no-op, not an error. */
export async function cancelChangeRequest(
  changeRequestId: string,
  ctx: RequestContext,
): Promise<ChangeRequest> {
  const row = await requireChangeRequestAccess(changeRequestId, ctx);
  const TERMINAL = new Set(["SUCCEEDED", "FAILED", "CANCELLED"]);
  if (TERMINAL.has(row.status)) return toChangeRequest(row);

  const updated = await updateChangeRequestRow(changeRequestId, {
    status: "CANCELLED",
    finishedAt: new Date(),
  });
  return toChangeRequest(updated);
}

/** Exported only for tests to await directly — `requestChange` itself
 * never awaits this; it runs in the background. Not part of the package's
 * public API. */
export async function planChangeRequest(
  changeRequestId: string,
  project: ProjectRow,
  ctx: RequestContext,
): Promise<void> {
  try {
    if (await isCancelled(changeRequestId)) return;

    const row = await findChangeRequestById(changeRequestId);
    if (!row) return;

    const workspaceStore = getWorkspaceStore();
    const template = loadTemplate(project.templateId);
    const conventions = renderConventions(template);
    const changeSummary = await buildChangeSummary(project.id);

    const retrieved = await retrieve(
      { query: row.request },
      { id: project.id, workspace: workspaceStore },
      "change",
    );
    const context = [
      retrieved.summary,
      ...retrieved.files.map((f) => `--- ${f.path} ---\n${f.contents}`),
    ].join("\n\n");

    const provider = getLLMProvider();
    const plan = await completeStructured({
      provider,
      model: modelFor("change"),
      schema: ChangePlanSchema,
      messages: [
        { role: "system", content: renderPrompt("system") },
        {
          role: "user",
          content: renderPrompt("change", {
            request: row.request,
            changeSummary,
            context,
            conventions,
          }),
        },
      ],
      ctx,
      refs: { projectId: project.id },
    });

    if (await isCancelled(changeRequestId)) return;

    await updateChangeRequestRow(changeRequestId, {
      status: "AWAITING_APPROVAL",
      plan: plan as unknown as Prisma.InputJsonValue,
    });
  } catch (cause) {
    await failChangeRequest(changeRequestId, "planning", cause);
  }
}

/** Exported only for tests to await directly — `approveChangeRequest`
 * itself never awaits this; it runs in the background. Not part of the
 * package's public API. */
export async function executeChangeRequest(
  changeRequestId: string,
  project: ProjectRow,
  ctx: RequestContext,
): Promise<void> {
  const workspaceStore = getWorkspaceStore();
  const runtime = getContainerRuntime();
  let workspacePath: string | undefined;
  let containerId: string | undefined;

  try {
    if (await isCancelled(changeRequestId)) return;

    const row = await findChangeRequestById(changeRequestId);
    const plan = row?.plan as unknown as ChangePlan | undefined;
    if (!row || !plan) {
      throw new ConflictError({
        message: "Change request has no plan to apply",
      });
    }

    workspacePath = await workspaceStore.resolve(project.id, ".");
    const template = loadTemplate(project.templateId);
    const specs = await loadApprovedSpecs(project.id, ctx);
    const conventions = renderConventions(template);
    const specsText = renderSpecsForPrompt(specs);
    const contractsPath = template.conventions.contractsPath;

    const container = await runtime.provision({
      projectId: project.id,
      image: APP_RUNTIME_IMAGE,
    });
    containerId = container.containerId;

    for (const task of plan.tasks) {
      if (await isCancelled(changeRequestId)) {
        await discardUncommittedChanges(workspacePath);
        return;
      }

      if (task.path === contractsPath) {
        // A contract change regenerates the shared types module through
        // its own dedicated generator (Phase 16), not an ad hoc rewrite —
        // freezeContracts's fixed task is what keeps every request/response
        // shape in sync with the App Structure spec; the plan's free-text
        // task for this path is a signal to regenerate, not the spec for
        // what to write. Its own internal typecheck-and-fix-loop is the
        // contract drift check: it doesn't return successfully unless the
        // whole project — including every file that imports from here —
        // still compiles.
        await freezeContracts({
          projectId: project.id,
          ctx,
          workspace: workspaceStore,
          runtime,
          containerId,
          cwd: workspacePath,
          conventions,
          specs: specsText,
          contractsPath,
        });
        continue;
      }

      await generateFile({
        path: task.path,
        task: task.task,
        conventions,
        specs: specsText,
        concern: concernForChangeTask(task.path, task.task),
        projectId: project.id,
        ctx,
        workspace: workspaceStore,
        runtime,
        containerId,
        cwd: workspacePath,
      });
    }

    if (await isCancelled(changeRequestId)) {
      await discardUncommittedChanges(workspacePath);
      return;
    }

    // Regression check: the same deterministic test cases the original
    // build authored from these specs — a change that breaks any of them
    // throws `UnresolvedTestFailuresError` and blocks completion exactly
    // like a build-time test failure does.
    const testCases = deriveTestCases(specs, template);
    if (testCases.length > 0) {
      const testResult = await runTestPhase({
        projectId: project.id,
        ctx,
        workspace: workspaceStore,
        runtime,
        containerId,
        cwd: workspacePath,
        conventions,
        specs: specsText,
        testCases,
        checkCancelled: () => isCancelled(changeRequestId),
      });
      if (testResult.status === "cancelled") {
        await discardUncommittedChanges(workspacePath);
        return;
      }
    }

    if (await isCancelled(changeRequestId)) {
      await discardUncommittedChanges(workspacePath);
      return;
    }

    const version = await recordVersion(
      project.id,
      workspacePath,
      plan.summary,
      ctx,
    );
    await updateChangeRequestRow(changeRequestId, {
      status: "SUCCEEDED",
      commitHash: version.hash,
      finishedAt: new Date(),
    });
  } catch (cause) {
    if (workspacePath) {
      await discardUncommittedChanges(workspacePath).catch(() => undefined);
    }
    await failChangeRequest(changeRequestId, "apply", cause);
  } finally {
    if (containerId) {
      await runtime.stop(containerId).catch(() => undefined);
    }
  }
}

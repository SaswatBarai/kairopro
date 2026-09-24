import type { RequestContext } from "../../lib/context";
import { findBuildById } from "./build.repository";
import { emitLog } from "./logs";

/**
 * The build step-sequence driver (Phase 15 / BE-10) — backend-owned:
 * concrete steps (provisioning, code generation) are injected, this file
 * only owns the loop, the cancel check, and checkpointing. Cancel is
 * checked at every step boundary, never mid-step — a half-written file is
 * worse than a delayed cancel — and a cancelled run always records a
 * checkpoint through `onCancelled` before returning, so the workspace never
 * sits between two states.
 */

export interface BuildStepContext {
  buildId: string;
  projectId: string;
  ctx: RequestContext;
  /** Shared across every step in one run — e.g. a provisioned container id
   * a later step needs. Steps own their own keys. */
  state: Record<string, unknown>;
}

export interface BuildStep {
  name: string;
  run(stepCtx: BuildStepContext): Promise<void>;
}

export interface RunWorkflowInput {
  buildId: string;
  projectId: string;
  ctx: RequestContext;
  steps: BuildStep[];
  /** Called once, when a step boundary finds the build cancelled — records
   * a checkpoint (a git commit) so the workspace is left consistent. Passed
   * the name of the step that was about to run, for the checkpoint commit
   * message ("Checkpoint: cancelled during {step}"). */
  onCancelled: (
    stepCtx: BuildStepContext,
    nextStepName: string,
  ) => Promise<void>;
}

export type WorkflowOutcome = "completed" | "cancelled";

async function isCancelled(buildId: string): Promise<boolean> {
  const row = await findBuildById(buildId);
  return row?.status === "CANCELLED";
}

export async function runWorkflow(
  input: RunWorkflowInput,
): Promise<WorkflowOutcome> {
  const { buildId, projectId, ctx, steps, onCancelled } = input;
  const stepCtx: BuildStepContext = { buildId, projectId, ctx, state: {} };

  for (const step of steps) {
    if (await isCancelled(buildId)) {
      await emitLog(
        buildId,
        "CHECKPOINT",
        JSON.stringify({ reason: "cancelled", beforeStep: step.name }),
      );
      await onCancelled(stepCtx, step.name);
      return "cancelled";
    }

    await emitLog(
      buildId,
      "STEP",
      JSON.stringify({ step: step.name, status: "started" }),
    );
    await step.run(stepCtx);
    await emitLog(
      buildId,
      "STEP",
      JSON.stringify({ step: step.name, status: "completed" }),
    );
  }

  return "completed";
}

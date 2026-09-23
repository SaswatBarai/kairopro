import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  NotFoundError,
  createInternalErrorRow,
  getSpecGenerator,
  logger,
  ownerOf,
  type RequestContext,
} from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string }> };

/** JSON-safe read of a typed app error's `details`, which is where the
 * cause actually lives; plain `Error`s have none. */
function errorDetails(err: unknown): string | null {
  const details = (err as { details?: unknown })?.details;
  if (details === undefined || details === null) return null;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

/**
 * Triggers spec generation (pm-questions → PRD → design → data model → app
 * structure, AI-5 / Phase 11) and returns immediately — the pipeline is
 * several sequential real LLM calls and can easily take over a minute, so
 * this must not be awaited inline the way it originally was; that made the
 * request hang until the entire pipeline finished, indistinguishable from
 * the button doing nothing. Same fire-and-forget shape as `startBuild`
 * (`build.service.ts`) and `requestChange` (`change-request.ts`): the
 * frontend's spec-list poll is what picks up progress, not this response.
 */
async function runGeneration(
  projectId: string,
  ctx: RequestContext,
): Promise<void> {
  try {
    await getSpecGenerator().generate(projectId, ctx);
    revalidatePath(`/projects/${projectId}`);
  } catch (err) {
    logger.error(
      { err, projectId },
      "spec generation crashed outside its own error handling",
    );
    // Also recorded as a row, not just a log line: this runs detached from
    // the request, so a console line is the only trace a failure otherwise
    // leaves — and the caller just sees an empty spec list forever, with no
    // way to tell "still running" from "died 20 minutes ago". `buildId` is
    // null because no build exists here; `detail.projectId` is what ties
    // the row back to the project.
    await createInternalErrorRow({
      buildId: null,
      step: "spec-generation",
      errorType: err instanceof Error ? err.constructor.name : "UnknownError",
      message: err instanceof Error ? err.message : String(err),
      detail: {
        projectId,
        stack: err instanceof Error ? (err.stack ?? null) : null,
        // The app's typed errors carry the part that actually identifies
        // the failure — e.g. `LLMStructuredOutputError.details.lastError`
        // holds the validator's rejection text. Without this the row says
        // only "failed validation after retries", which names the step but
        // not the cause.
        details: errorDetails(err),
      },
    }).catch((writeErr) => {
      logger.error(
        { err: writeErr, projectId },
        "failed to write InternalError row",
      );
    });
  }
}

export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    enforceRateLimit("generation", ctx.orgId);
    const project = await ownerOf(id, ctx);
    if (!project) {
      throw new NotFoundError({ message: "Project not found" });
    }
    void runGeneration(id, ctx);
    return new NextResponse(null, { status: 202 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

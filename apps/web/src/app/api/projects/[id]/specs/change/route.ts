import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { RequestSpecChangeInputSchema } from "@kairopro/contracts";
import { ValidationError, getSpecGenerator } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Applies a natural-language change to the project's PRD and regenerates the
 * data model and app structure to match. Unlike `specs/generate`, this is
 * awaited: the caller is a chat panel that shows the agent's reply (or the
 * real error) as the response, so there is nothing for a detached run to
 * report to. It takes up to a minute — three sequential LLM calls.
 *
 * Project ownership is checked inside `revise` (via `listSpecs`).
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    enforceRateLimit("generation", ctx.orgId);

    const body = await req.json().catch(() => null);
    const parsed = RequestSpecChangeInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError({
        message: "Invalid change request",
        details: parsed.error.flatten(),
      });
    }

    const result = await getSpecGenerator().revise(
      id,
      parsed.data.instruction,
      ctx,
    );
    revalidatePath(`/projects/${id}`);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

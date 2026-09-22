import { NextResponse } from "next/server";
import { approveChangeRequest } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string; changeId: string }> };

/** Approves the plan and starts applying it. Returns immediately with the
 * change request now in APPLYING — the apply itself runs in the
 * background, same shape as `POST .../builds`. */
export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { changeId } = await params;
    const ctx = await getRequestContext();
    enforceRateLimit("build", ctx.orgId);
    const changeRequest = await approveChangeRequest(changeId, ctx);
    return NextResponse.json(changeRequest, { status: 202 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

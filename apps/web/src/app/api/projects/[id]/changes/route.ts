import { NextResponse } from "next/server";
import { RequestChangeInputSchema } from "@kairopro/contracts";
import {
  listChangeRequests,
  requestChange,
  ValidationError,
} from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string }> };

/** Requests a plan for a change. Returns immediately with the new
 * (PLANNING) change request — planning itself runs in the background and
 * moves it to AWAITING_APPROVAL, same shape as `POST .../builds`. */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    enforceRateLimit("generation", ctx.orgId);

    const body = await req.json().catch(() => ({}));
    const parsed = RequestChangeInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError({
        message: "Invalid change request input",
        details: parsed.error.flatten(),
      });
    }

    const changeRequest = await requestChange(id, parsed.data, ctx);
    return NextResponse.json(changeRequest, { status: 202 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    const changeRequests = await listChangeRequests(id, ctx);
    return NextResponse.json(changeRequests);
  } catch (err) {
    return toErrorResponse(err);
  }
}

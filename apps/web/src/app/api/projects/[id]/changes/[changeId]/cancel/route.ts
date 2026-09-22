import { NextResponse } from "next/server";
import { cancelChangeRequest } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string; changeId: string }> };

/** Idempotent: cancelling a change request that has already finished
 * (including one already cancelled) just returns its current state. */
export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { changeId } = await params;
    const ctx = await getRequestContext();
    const changeRequest = await cancelChangeRequest(changeId, ctx);
    return NextResponse.json(changeRequest);
  } catch (err) {
    return toErrorResponse(err);
  }
}

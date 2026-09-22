import { NextResponse } from "next/server";
import { getChangeRequest } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string; changeId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { changeId } = await params;
    const ctx = await getRequestContext();
    const changeRequest = await getChangeRequest(changeId, ctx);
    return NextResponse.json(changeRequest);
  } catch (err) {
    return toErrorResponse(err);
  }
}

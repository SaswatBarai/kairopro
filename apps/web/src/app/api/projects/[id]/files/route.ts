import { NextResponse } from "next/server";
import { listProjectFiles } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string }> };

// A build writes to the workspace while this is being watched; never cache it.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    return NextResponse.json(await listProjectFiles(id, ctx));
  } catch (err) {
    return toErrorResponse(err);
  }
}

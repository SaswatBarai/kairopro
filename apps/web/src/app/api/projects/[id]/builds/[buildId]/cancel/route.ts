import { NextResponse } from "next/server";
import { cancelBuild } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string; buildId: string }> };

/** Idempotent: cancelling a build that has already finished (including one
 * already cancelled) just returns its current state. */
export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { buildId } = await params;
    const ctx = await getRequestContext();
    const build = await cancelBuild(buildId, ctx);
    return NextResponse.json(build);
  } catch (err) {
    return toErrorResponse(err);
  }
}

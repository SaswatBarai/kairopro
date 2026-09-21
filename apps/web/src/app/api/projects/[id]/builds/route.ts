import { NextResponse } from "next/server";
import { listBuilds, startBuild } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string }> };

/** Starts a build. Returns immediately with the new (QUEUED) build — the
 * workflow itself runs in the background (Phase 15 / BE-10). */
export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    const build = await startBuild(id, ctx);
    return NextResponse.json(build, { status: 202 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    const builds = await listBuilds(id, ctx);
    return NextResponse.json(builds);
  } catch (err) {
    return toErrorResponse(err);
  }
}

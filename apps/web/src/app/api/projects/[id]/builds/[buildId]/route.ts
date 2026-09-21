import { NextResponse } from "next/server";
import { getBuild } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string; buildId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { buildId } = await params;
    const ctx = await getRequestContext();
    const build = await getBuild(buildId, ctx);
    return NextResponse.json(build);
  } catch (err) {
    return toErrorResponse(err);
  }
}

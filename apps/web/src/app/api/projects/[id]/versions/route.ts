import { NextResponse } from "next/server";
import { listVersions } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    const versions = await listVersions(id, ctx);
    return NextResponse.json(versions);
  } catch (err) {
    return toErrorResponse(err);
  }
}

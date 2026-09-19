import { NextResponse } from "next/server";
import { listCredentials } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    const credentials = await listCredentials(id, ctx);
    return NextResponse.json(credentials);
  } catch (err) {
    return toErrorResponse(err);
  }
}

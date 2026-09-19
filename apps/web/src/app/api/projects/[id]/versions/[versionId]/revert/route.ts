import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { revertVersion } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { id, versionId } = await params;
    const ctx = await getRequestContext();
    const version = await revertVersion(versionId, ctx);
    revalidatePath(`/projects/${id}`);
    return NextResponse.json(version);
  } catch (err) {
    return toErrorResponse(err);
  }
}

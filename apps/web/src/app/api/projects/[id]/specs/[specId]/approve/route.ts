import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { approveSpec } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string; specId: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { id, specId } = await params;
    const ctx = await getRequestContext();
    const spec = await approveSpec(specId, ctx);
    revalidatePath(`/projects/${id}`);
    return NextResponse.json(spec);
  } catch (err) {
    return toErrorResponse(err);
  }
}

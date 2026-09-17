import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteInput } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string; inputId: string }> };

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id, inputId } = await params;
    const ctx = await getRequestContext();
    await deleteInput(id, inputId, ctx);
    revalidatePath(`/projects/${id}`);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

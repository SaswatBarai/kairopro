import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ReviseSpecInputSchema } from "@kairopro/contracts";
import { ValidationError, reviseSpec } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string; specId: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id, specId } = await params;
    const ctx = await getRequestContext();
    const body = await req.json();
    const result = ReviseSpecInputSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError({
        message: "Invalid revise input",
        details: result.error.flatten(),
      });
    }
    const spec = await reviseSpec(specId, result.data.content, ctx);
    revalidatePath(`/projects/${id}`);
    return NextResponse.json(spec);
  } catch (err) {
    return toErrorResponse(err);
  }
}

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { NotFoundError, getSpecGenerator, ownerOf } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Triggers spec generation. The real workflow (pm-questions → PRD → design →
 * data model → app structure) lands with AI-5 in Phase 11; until then this
 * calls the stub generator, which reports the seam as not yet available.
 */
export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    const project = await ownerOf(id, ctx);
    if (!project) {
      throw new NotFoundError({ message: "Project not found" });
    }
    await getSpecGenerator().generate(id, ctx);
    revalidatePath(`/projects/${id}`);
    return new NextResponse(null, { status: 202 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

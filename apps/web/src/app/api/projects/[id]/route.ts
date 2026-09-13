import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { UpdateProjectInputSchema } from "@kairopro/contracts";
import { deleteProject, getProject, updateProject } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    const project = await getProject(id, ctx);
    return NextResponse.json(project);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parseResult = UpdateProjectInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Project name must be 1-60 characters; description up to 2000.",
          },
        },
        { status: 400 },
      );
    }

    const ctx = await getRequestContext();
    const project = await updateProject(id, parseResult.data, ctx);
    revalidatePath("/dashboard");
    return NextResponse.json(project);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    await deleteProject(id, ctx);
    revalidatePath("/dashboard");
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

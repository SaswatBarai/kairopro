import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { CreateProjectInputSchema } from "@kairopro/contracts";
import { createProject, listProjects } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

export async function GET() {
  try {
    const ctx = await getRequestContext();
    const projects = await listProjects(ctx);
    return NextResponse.json(projects);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = CreateProjectInputSchema.safeParse(body);
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
    const project = await createProject(parseResult.data, ctx);
    revalidatePath("/dashboard");
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

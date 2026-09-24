import { NextResponse } from "next/server";
import { ValidationError, readProjectFile } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    const path = new URL(req.url).searchParams.get("path");
    if (!path) {
      throw new ValidationError({
        message: "A `path` query parameter is required",
      });
    }
    return NextResponse.json(await readProjectFile(id, path, ctx));
  } catch (err) {
    return toErrorResponse(err);
  }
}

import { NextResponse } from "next/server";
import { DeployInputSchema } from "@kairopro/contracts";
import { deploy, ValidationError } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    enforceRateLimit("deploy", ctx.orgId);

    const body = await req.json().catch(() => ({}));
    const parsed = DeployInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError({
        message: "Invalid deploy input",
        details: parsed.error.flatten(),
      });
    }

    const result = await deploy(id, parsed.data, ctx);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

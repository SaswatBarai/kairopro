import { NextResponse } from "next/server";
import { GithubConnectInputSchema } from "@kairopro/contracts";
import {
  connectGithub,
  exportToGithub,
  getGithubConnectionStatus,
  ValidationError,
} from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string }> };

/** Connects (or reconnects) the GitHub account used for export, then
 * pushes. Accepting the token here (rather than a separate connect step)
 * keeps this phase to what the plan actually lists — no OAuth
 * authorization-code callback route exists yet, so the frontend is expected
 * to have already obtained an access token before calling this. */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();

    const body = await req.json().catch(() => ({}));
    const parsed = GithubConnectInputSchema.safeParse(body);
    if (parsed.success) {
      await connectGithub(id, parsed.data, ctx);
    } else if (Object.keys(body ?? {}).length > 0) {
      throw new ValidationError({
        message: "Invalid GitHub connection input",
        details: parsed.error.flatten(),
      });
    }

    const result = await exportToGithub(id, ctx);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    const status = await getGithubConnectionStatus(id, ctx);
    return NextResponse.json(status);
  } catch (err) {
    return toErrorResponse(err);
  }
}

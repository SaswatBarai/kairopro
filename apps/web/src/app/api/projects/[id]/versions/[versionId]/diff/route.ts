import { NextResponse } from "next/server";
import { getVersionDiff } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

/** Always includes `summary`; the raw unified diff is included only when
 * `?raw=1` is passed, so a history list that just wants the +/- counts
 * doesn't pay for the full patch text on every row. */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { versionId } = await params;
    const ctx = await getRequestContext();
    const diff = await getVersionDiff(versionId, ctx);

    const wantsRaw = new URL(req.url).searchParams.get("raw") === "1";
    return NextResponse.json(wantsRaw ? diff : { summary: diff.summary });
  } catch (err) {
    return toErrorResponse(err);
  }
}

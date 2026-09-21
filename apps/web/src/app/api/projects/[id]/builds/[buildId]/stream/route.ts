import { getBuild, streamBuildEvents } from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string; buildId: string }> };

// SSE must never be cached or statically evaluated.
export const dynamic = "force-dynamic";

/**
 * Build event stream (Phase 15 / BE-10). Replays from `Last-Event-ID` on
 * reconnect, then live events, with a keepalive comment every 15s — all of
 * that logic lives in `streamBuildEvents` (core); this route is only the
 * HTTP/ReadableStream adapter around it.
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { buildId } = await params;
    const ctx = await getRequestContext();
    await getBuild(buildId, ctx); // access check — throws NotFoundError

    const lastEventIdHeader = req.headers.get("last-event-id");
    const parsed = lastEventIdHeader ? Number(lastEventIdHeader) : NaN;
    const lastEventSeq = Number.isFinite(parsed) ? parsed : -1;

    const controller = new AbortController();
    const generator = streamBuildEvents({
      buildId,
      lastEventSeq,
      signal: controller.signal,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async pull(streamController) {
        const { value, done } = await generator.next();
        if (done) {
          streamController.close();
          return;
        }
        streamController.enqueue(encoder.encode(value));
      },
      cancel() {
        controller.abort();
        void generator.return(undefined);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

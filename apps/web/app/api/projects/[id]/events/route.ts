import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redis } from "@/lib/queue";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id: projectId } = await params;
  
  // Create a new stream
  const stream = new ReadableStream({
    async start(controller) {
      const subscriber = redis.duplicate();
      
      // Wait for connection
      await subscriber.connect().catch(() => {}); // catch to ignore if already connected depending on ioredis setup

      // We subscribe to all runs for this project. The orchestrator emits to project-events:<run_id>
      // To get all events for a project, we could use psubscribe `project-events:*` or specifically pass the runId 
      // Let's assume the frontend passes runId as a query param, or we just psubscribe.
      // Wait, in Phase 4 plan it says: subscribe(`project-events:${params.id}`) meaning the publisher uses project ID.
      // Ah, the Python Orchestrator snippet says `f"project-events:{run_id}"`.
      // Let's use psubscribe so we get all events, or extract runId from query.
      
      const url = new URL(req.url);
      const runId = url.searchParams.get("runId");
      
      const channel = runId ? `project-events:${runId}` : `project-events:*`;
      
      if (channel.includes("*")) {
        await subscriber.psubscribe(channel);
        subscriber.on("pmessage", (pattern, chan, message) => {
          controller.enqueue(new TextEncoder().encode(`data: ${message}\n\n`));
        });
      } else {
        await subscriber.subscribe(channel);
        subscriber.on("message", (chan, message) => {
          controller.enqueue(new TextEncoder().encode(`data: ${message}\n\n`));
        });
      }

      // Handle stream closure
      req.signal.addEventListener("abort", () => {
        if (channel.includes("*")) {
          subscriber.punsubscribe(channel);
        } else {
          subscriber.unsubscribe(channel);
        }
        subscriber.quit();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  });
}

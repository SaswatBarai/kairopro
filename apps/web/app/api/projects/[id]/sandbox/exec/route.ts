import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { execInSandbox } from "@/lib/docker";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    const isService = authHeader === `Bearer ${process.env.AI_SERVICE_TOKEN}`;
    
    if (!isService) {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { command } = await req.json();
    const { id: projectId } = await params;
    
    const workspace = await db.workspace.findUnique({ where: { projectId } });
    if (!workspace?.containerId) {
        return NextResponse.json({ error: "Sandbox not running" }, { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
            const { stdout, stderr } = await execInSandbox(workspace.containerId!, command);
            controller.enqueue(`data: ${JSON.stringify({ type: 'stdout', data: stdout })}\n\n`);
            if (stderr) {
                controller.enqueue(`data: ${JSON.stringify({ type: 'stderr', data: stderr })}\n\n`);
            }
        } catch (e: any) {
            controller.enqueue(`data: ${JSON.stringify({ type: 'error', data: e.message })}\n\n`);
        } finally {
            controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiAnalysisQueue } from "@/lib/queue";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    
    // Create new AgentRun for the clarification pass
    const agentRun = await db.agentRun.create({
      data: {
        projectId,
        agentType: "requirement",
        status: "running",
        input: { clarification: true },
        startedAt: new Date(),
      },
    });

    // Enqueue job for FastAPI processing
    await aiAnalysisQueue.add("run-clarification-agent", {
      projectId,
      runId: agentRun.id,
      agentType: "requirement",
      input: { clarification: true }
    });

    return NextResponse.json({ runId: agentRun.id, status: "started" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to start clarification" }, { status: 500 });
  }
}

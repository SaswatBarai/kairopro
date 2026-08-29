import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiAnalysisQueue } from "@/lib/queue";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    
    const { problemStatement } = await req.json();
    if (!problemStatement) {
      return NextResponse.json({ error: "problemStatement is required" }, { status: 400 });
    }

    // Update project state to analyzing
    await db.project.update({
      where: { id: projectId },
      data: { state: "analyzing" },
    });

    // Create AgentRun record
    const agentRun = await db.agentRun.create({
      data: {
        projectId,
        agentType: "requirement",
        status: "running",
        input: { problem_statement: problemStatement },
        startedAt: new Date(),
      },
    });

    // Enqueue job for FastAPI processing
    await aiAnalysisQueue.add("run-requirement-agent", {
      projectId,
      runId: agentRun.id,
      agentType: "requirement",
      input: { problem_statement: problemStatement }
    });

    logger.info(`Started requirement analysis agent run ${agentRun.id} for project ${projectId}`);

    return NextResponse.json({ runId: agentRun.id, status: "started" });
  } catch (error) {
    logger.error("Error starting analysis:", error);
    return NextResponse.json({ error: "Failed to start analysis" }, { status: 500 });
  }
}

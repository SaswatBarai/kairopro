import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;

    const body = await req.json().catch(() => ({}));
    const problemStatement = body.problemStatement;
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

    // Call FastAPI directly (no BullMQ worker needed — FastAPI uses BackgroundTasks internally)
    const fastApiUrl = process.env.AI_ENGINE_URL || "http://localhost:8000";
    const serviceToken = process.env.AI_SERVICE_TOKEN || "";

    const aiRes = await fetch(`${fastApiUrl}/ai/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Token": serviceToken,
      },
      body: JSON.stringify({
        projectId,
        runId: agentRun.id,
        input: { problem_statement: problemStatement },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      logger.error(`FastAPI analyze failed: ${errText}`);
      // Mark run as failed but don't crash — state is already "analyzing"
      await db.agentRun.update({
        where: { id: agentRun.id },
        data: { status: "failed", completedAt: new Date(), error: errText },
      });
      return NextResponse.json({ error: "AI engine failed to start analysis" }, { status: 502 });
    }

    logger.info(`Dispatched requirement agent run ${agentRun.id} to FastAPI for project ${projectId}`);
    return NextResponse.json({ runId: agentRun.id, status: "started" });
  } catch (error: any) {
    logger.error("Error starting analysis:", error);
    return NextResponse.json({ error: "Failed to start analysis" }, { status: 500 });
  }
}

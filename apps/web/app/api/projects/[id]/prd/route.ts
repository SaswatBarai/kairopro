import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    
    // Get latest PRD
    const prd = await db.pRDVersion.findFirst({
      where: { projectId },
      orderBy: { version: "desc" }
    });

    return NextResponse.json({ prd });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;

    // Get requirements to pass to PRD agent
    const requirements = await db.requirement.findMany({
      where: { projectId }
    });

    const agentRun = await db.agentRun.create({
      data: {
        projectId,
        agentType: "prd",
        status: "running",
        input: { requirements },
        startedAt: new Date(),
      },
    });

    const fastApiUrl = process.env.AI_ENGINE_URL || "http://localhost:8000";
    const serviceToken = process.env.AI_SERVICE_TOKEN || "";

    const aiRes = await fetch(`${fastApiUrl}/ai/prd/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Token": serviceToken,
      },
      body: JSON.stringify({
        projectId,
        runId: agentRun.id,
        requirements,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      logger.error(`FastAPI PRD generation failed: ${errText}`);
      return NextResponse.json({ error: "Failed to start PRD generation" }, { status: 502 });
    }

    return NextResponse.json({ runId: agentRun.id, status: "started" });
  } catch (error) {
    logger.error("Error starting PRD generation:", error);
    return NextResponse.json({ error: "Failed to start PRD generation" }, { status: 500 });
  }
}

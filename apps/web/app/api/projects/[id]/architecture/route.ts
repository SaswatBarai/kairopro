import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiAnalysisQueue } from "@/lib/queue";
import { logger } from "@/lib/logger";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    
    const archs = await db.architectureVersion.findMany({
      where: { projectId },
      orderBy: { version: "desc" }
    });

    return NextResponse.json({ architectures: archs });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    
    // Get latest PRD
    const latestPrd = await db.pRDVersion.findFirst({
      where: { projectId },
      orderBy: { version: "desc" }
    });

    // Get latest approved Design
    const latestDesign = await db.designVersion.findFirst({
      where: { projectId, isApproved: true },
      orderBy: { version: "desc" }
    });

    if (!latestPrd || !latestDesign) {
      return NextResponse.json({ error: "Both PRD and Design must be approved before Architecture generation" }, { status: 400 });
    }

    const run = await db.agentRun.create({
      data: {
        projectId,
        agentType: "architecture",
        status: "running"
      }
    });

    await aiAnalysisQueue.add("architecture-agent", {
      projectId,
      runId: run.id,
      agentType: "architecture",
      input: { prd: latestPrd.content, design: latestDesign.designSpec }
    });

    return NextResponse.json({ success: true, runId: run.id });
  } catch (error) {
    logger.error("Error starting architecture agent:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

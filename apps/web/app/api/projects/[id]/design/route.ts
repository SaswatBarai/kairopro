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
    
    // Check project access
    const project = await db.project.findFirst({
      where: { id: projectId },
      include: {
        designVersions: {
          orderBy: [{ version: "desc" }, { designOption: "asc" }],
        },
      }
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    return NextResponse.json({ designs: project.designVersions });
  } catch (error) {
    logger.error("Error fetching designs:", error);
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

    if (!latestPrd) {
      return NextResponse.json({ error: "No approved PRD found to base design on" }, { status: 400 });
    }

    // Create AgentRun
    const run = await db.agentRun.create({
      data: {
        projectId,
        agentType: "design",
        status: "running"
      }
    });

    // Determine new design version
    const lastDesign = await db.designVersion.findFirst({
      where: { projectId },
      orderBy: { version: "desc" }
    });
    const nextVersion = lastDesign ? lastDesign.version + 1 : 1;

    // Enqueue
    await aiAnalysisQueue.add("design-agent", {
      projectId,
      runId: run.id,
      agentType: "design",
      input: { prd: latestPrd.content }
    });

    return NextResponse.json({ success: true, runId: run.id, nextVersion });
  } catch (error) {
    logger.error("Error starting design agent:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

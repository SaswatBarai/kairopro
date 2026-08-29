import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiAnalysisQueue } from "@/lib/queue";

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

    // Get locked requirements to pass to PRD agent
    const requirements = await db.requirement.findMany({
      where: { projectId, status: { in: ["locked", "approved"] } }
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

    await aiAnalysisQueue.add("run-prd-agent", {
      projectId,
      runId: agentRun.id,
      agentType: "prd",
      input: { requirements }
    });

    return NextResponse.json({ runId: agentRun.id, status: "started" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to start PRD generation" }, { status: 500 });
  }
}

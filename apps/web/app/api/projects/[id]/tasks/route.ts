import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiAnalysisQueue } from "@/lib/queue";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    
    const tasks = await db.task.findMany({
        where: { projectId },
        orderBy: { orderIndex: 'asc' }
    });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    
    const arch = await db.architectureVersion.findFirst({ where: { projectId, isApproved: true }, orderBy: { version: 'desc' } });
    const prd = await db.pRDVersion.findFirst({ where: { projectId }, orderBy: { version: 'desc' } });
    const design = await db.designVersion.findFirst({ where: { projectId, isApproved: true }, orderBy: { version: 'desc' } });

    if (!arch || !prd || !design) {
        return NextResponse.json({ error: "Missing approved architecture, PRD, or design" }, { status: 400 });
    }

    const agentRun = await db.agentRun.create({
        data: { projectId, agentType: "developer", status: "pending", input: { architectureId: arch.id } }
    });

    await aiAnalysisQueue.add("ai-analysis", {
        projectId,
        runId: agentRun.id,
        agentType: "developer",
        input: { architecture: arch.architectureSpec, prd: prd.content, design: design.designSpec }
    });

    return NextResponse.json({ success: true, runId: agentRun.id });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

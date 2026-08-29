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
    
    const messages = await db.chatMessage.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { content } = await req.json();

    if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });

    const userMessage = await db.chatMessage.create({
        data: {
            projectId,
            userId: (session.user as any).id,
            role: "user",
            content
        }
    });
    
    const agentRun = await db.agentRun.create({
        data: { projectId, agentType: "developer", status: "pending", input: { chatContent: content } }
    });
    
    await aiAnalysisQueue.add("ai-analysis", {
        projectId,
        runId: agentRun.id,
        agentType: "chat",
        input: { message: content }
    });

    return NextResponse.json({ success: true, message: userMessage });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string, taskId: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    const isService = authHeader === `Bearer ${process.env.AI_SERVICE_TOKEN}`;
    
    if (!isService) {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;
    const { status } = await req.json();

    const task = await db.task.findUnique({ where: { id: taskId, projectId } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: any = { status };
    if (status === "in_progress") data.startedAt = new Date();
    if (status === "completed" || status === "failed") data.completedAt = new Date();

    const updatedTask = await db.task.update({
        where: { id: taskId },
        data
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

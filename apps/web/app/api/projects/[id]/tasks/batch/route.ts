import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    const isService = authHeader === `Bearer ${process.env.AI_SERVICE_TOKEN}`;
    
    if (!isService) {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { tasks } = await req.json();

    if (!Array.isArray(tasks)) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Delete existing pending tasks if any (for fresh planning)
    await db.task.deleteMany({ where: { projectId, status: "pending" } });

    const createdTasks = await db.task.createMany({
        data: tasks.map((t: any, index: number) => ({
            projectId,
            title: t.title || "Unnamed task",
            description: t.description || "",
            taskType: t.taskType || "backend",
            orderIndex: t.orderIndex ?? index,
            status: "pending"
        }))
    });

    return NextResponse.json({ success: true, count: createdTasks.count });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

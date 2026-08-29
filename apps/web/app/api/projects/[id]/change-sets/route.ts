import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    
    const changeSets = await db.changeSet.findMany({
        where: { projectId },
        include: { fileChanges: true },
        orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ changeSets });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    const isService = authHeader === `Bearer ${process.env.AI_SERVICE_TOKEN}`;
    
    if (!isService) {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { taskId, description, fileChanges } = await req.json();

    if (!taskId || !fileChanges || !Array.isArray(fileChanges)) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Try to find the workspace to read contentBefore, but in this implementation,
    // we assume AI provides contentAfter only, and getting contentBefore is ideal for rollbacks.
    // For simplicity, we just save what is provided.
    
    const changeSet = await db.changeSet.create({
        data: {
            projectId,
            taskId,
            description,
            status: "applied",
            fileChanges: {
                create: fileChanges.map((fc: any) => ({
                    action: fc.action,
                    filePath: fc.filePath,
                    contentAfter: fc.contentAfter,
                    contentBefore: fc.contentBefore || ""
                }))
            }
        },
        include: { fileChanges: true }
    });

    return NextResponse.json({ success: true, changeSet });
  } catch (error: any) {
    console.error("Error creating changeset", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

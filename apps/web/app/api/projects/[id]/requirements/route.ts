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
    
    const requirements = await db.requirement.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({ requirements });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { requirementId, status, userAnswer } = await req.json();

    const updateData: any = {};
    if (status) updateData.status = status;
    if (userAnswer !== undefined) updateData.userAnswer = userAnswer;

    const updated = await db.requirement.update({
      where: { id: requirementId, projectId },
      data: updateData
    });

    // If all requirements are locked, update project state to prd_ready
    if (status === "locked") {
      const allReqs = await db.requirement.findMany({ where: { projectId } });
      if (allReqs.every(r => r.status === "locked" || r.status === "approved")) {
        await db.project.update({
          where: { id: projectId },
          data: { state: "prd_ready" }
        });
      }
    }

    return NextResponse.json({ requirement: updated });
  } catch (error) {
    logger.error("Error updating requirement:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

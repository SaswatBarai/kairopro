import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string, designId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, designId } = await params;
    
    // Check project access and design exists
    const design = await db.designVersion.findUnique({ where: { id: designId } });
    if (!design || design.projectId !== projectId) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    // Unapprove all other designs for this project
    await db.designVersion.updateMany({
      where: { projectId, id: { not: designId } },
      data: { isApproved: false }
    });

    // Approve this design
    const updated = await db.designVersion.update({
      where: { id: designId },
      data: { isApproved: true }
    });

    // Update Project State
    await db.project.update({
      where: { id: projectId },
      data: { state: "design_ready" }
    });

    return NextResponse.json({ success: true, design: updated });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

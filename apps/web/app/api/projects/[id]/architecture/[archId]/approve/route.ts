import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string, archId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, archId } = await params;
    
    const arch = await db.architectureVersion.findUnique({ where: { id: archId } });
    if (!arch || arch.projectId !== projectId) {
      return NextResponse.json({ error: "Architecture not found" }, { status: 404 });
    }

    await db.architectureVersion.updateMany({
      where: { projectId, id: { not: archId } },
      data: { isApproved: false }
    });

    const updated = await db.architectureVersion.update({
      where: { id: archId },
      data: { isApproved: true }
    });

    await db.project.update({
      where: { id: projectId },
      data: { state: "architecture_ready" } // or approved depending on flow
    });

    return NextResponse.json({ success: true, architecture: updated });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

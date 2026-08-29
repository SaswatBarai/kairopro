import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile } from "@/lib/docker";

export async function POST(req: Request, { params }: { params: Promise<{ id: string, csId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, csId } = await params;

    const changeSet = await db.changeSet.findUnique({
      where: { id: csId, projectId },
      include: { fileChanges: true }
    });

    if (!changeSet) {
        return NextResponse.json({ error: "Change set not found" }, { status: 404 });
    }

    if (changeSet.status === 'rolled_back') {
        return NextResponse.json({ error: "Already rolled back" }, { status: 400 });
    }

    const workspace = await db.workspace.findUnique({ where: { projectId } });
    if (!workspace?.containerId) {
        return NextResponse.json({ error: "Sandbox not running" }, { status: 400 });
    }

    // Restore each file in reverse order to undo changes
    for (const fc of [...changeSet.fileChanges].reverse()) {
      if (fc.contentBefore !== null) {
        await writeFile(workspace.containerId, `/workspace/${fc.filePath}`, fc.contentBefore);
      }
    }

    await db.changeSet.update({ 
        where: { id: csId }, 
        data: { status: 'rolled_back' } 
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

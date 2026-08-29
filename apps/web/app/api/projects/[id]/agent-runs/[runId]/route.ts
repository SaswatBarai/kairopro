import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string, runId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, runId } = await params;
    
    const run = await db.agentRun.findUnique({
      where: { id: runId, projectId },
      include: {
        events: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { docker } from "@/lib/docker";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const workspace = await db.workspace.findUnique({ where: { projectId } });

    if (!workspace) return NextResponse.json({ status: "not_found" });

    // Sync with actual docker state
    if (workspace.containerId) {
        try {
            const container = docker.getContainer(workspace.containerId);
            const data = await container.inspect();
            if (!data.State.Running && workspace.status === "running") {
                await db.workspace.update({
                    where: { id: workspace.id },
                    data: { status: "stopped" }
                });
                workspace.status = "stopped";
            }
        } catch (e) {
            // Container missing
            await db.workspace.update({
                where: { id: workspace.id },
                data: { status: "stopped", containerId: null }
            });
            workspace.status = "stopped";
            workspace.containerId = null;
        }
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

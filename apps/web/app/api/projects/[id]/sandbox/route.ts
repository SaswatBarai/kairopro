import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSandbox, docker } from "@/lib/docker";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    
    let workspace = await db.workspace.findUnique({ where: { projectId } });

    if (!workspace) {
        workspace = await db.workspace.create({
            data: { projectId, status: "starting" }
        });
    } else {
        await db.workspace.update({
            where: { id: workspace.id },
            data: { status: "starting" }
        });
    }

    // Provision container
    const containerId = await createSandbox(projectId);

    // Update DB
    workspace = await db.workspace.update({
        where: { id: workspace.id },
        data: { containerId, status: "running" } // port allocation would happen dynamically via reverse proxy / load balancer
    });

    return NextResponse.json({ success: true, workspace });
  } catch (error: any) {
    console.error("Sandbox creation failed:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
        const { id: projectId } = await params;
        const workspace = await db.workspace.findUnique({ where: { projectId } });

        if (workspace?.containerId) {
            const container = docker.getContainer(workspace.containerId);
            try {
                await container.stop();
                await container.remove();
            } catch (e) {
                // Ignore if already removed/stopped
            }
        }

        if (workspace) {
            await db.workspace.update({
                where: { id: workspace.id },
                data: { status: "stopped", containerId: null }
            });
        }
    
        return NextResponse.json({ success: true });
      } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
      }
}

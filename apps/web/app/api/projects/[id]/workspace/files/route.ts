import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { listFiles, readFile, writeFile } from "@/lib/docker";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    
    const url = new URL(req.url);
    const filePath = url.searchParams.get("path");

    const workspace = await db.workspace.findUnique({ where: { projectId } });
    if (!workspace?.containerId) {
        return NextResponse.json({ files: [] }); // Or error
    }

    if (filePath) {
        // Get file content
        const content = await readFile(workspace.containerId, `/workspace/${filePath}`);
        return new NextResponse(content, { headers: { "Content-Type": "text/plain" }});
    } else {
        // List directory
        const files = await listFiles(workspace.containerId);
        return NextResponse.json({ files });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
        const { id: projectId } = await params;
        const { path: filePath, content } = await req.json();
    
        const workspace = await db.workspace.findUnique({ where: { projectId } });
        if (!workspace?.containerId) {
            return NextResponse.json({ error: "Sandbox not running" }, { status: 400 });
        }
    
        await writeFile(workspace.containerId, `/workspace/${filePath}`, content);
        return NextResponse.json({ success: true });
      } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
      }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
        const { id: projectId } = await params;
        const { path: filePath, isDirectory } = await req.json();
    
        const workspace = await db.workspace.findUnique({ where: { projectId } });
        if (!workspace?.containerId) {
            return NextResponse.json({ error: "Sandbox not running" }, { status: 400 });
        }
    
        if (isDirectory) {
            // we use docker exec directly to bypass importing it, assuming our writeFile wrapper does it, but let's do a direct one
            const { execInSandbox } = await import("@/lib/docker");
            await execInSandbox(workspace.containerId, ['mkdir', '-p', `/workspace/${filePath}`]);
        } else {
            await writeFile(workspace.containerId, `/workspace/${filePath}`, "");
        }
        return NextResponse.json({ success: true });
      } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
      }
}

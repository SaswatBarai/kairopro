import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { currentArch, prompt, archId } = await req.json();

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const fastapiUrl = process.env.AI_ENGINE_URL || "http://localhost:8000";
    const res = await fetch(`${fastapiUrl}/ai/architecture/modify`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AI_SERVICE_TOKEN || "development_secret_token"}`
      },
      body: JSON.stringify({ projectId, currentArch, prompt }),
    });

    if (!res.ok) throw new Error("FastAPI modify failed");
    
    const data = await res.json();

    // Create a new version in DB with the updated architecture
    if (data.updatedArchitecture) {
        const lastArch = await db.architectureVersion.findFirst({
            where: { projectId },
            orderBy: { version: "desc" }
        });
        const nextVersion = lastArch ? lastArch.version + 1 : 1;

        const newArch = await db.architectureVersion.create({
            data: {
                projectId,
                version: nextVersion,
                architectureSpec: data.updatedArchitecture,
                generatedBy: "ai-modify"
            }
        });

        return NextResponse.json({ success: true, architecture: newArch });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Architecture modify error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

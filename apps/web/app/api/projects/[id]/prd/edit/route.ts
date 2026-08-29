import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { sectionContent, prompt } = await req.json();

    if (!sectionContent || !prompt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify access
    const project = await db.project.findFirst({
      where: { id: projectId }
    });

    if (!project) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const fastapiUrl = process.env.AI_ENGINE_URL || "http://localhost:8000";
    const res = await fetch(`${fastapiUrl}/ai/edit`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AI_SERVICE_TOKEN || "development_secret_token"}`
      },
      body: JSON.stringify({ projectId, sectionContent, prompt }),
    });

    if (!res.ok) {
      throw new Error("FastAPI edit failed");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("AI PRD Edit error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

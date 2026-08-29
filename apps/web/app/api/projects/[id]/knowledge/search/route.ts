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
    const userId = (session.user as any).id;

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [{ createdById: userId }, { members: { some: { userId } } }, { organization: { members: { some: { userId } } } }],
      },
    });
    if (!project) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { query, limit = 10 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Proxy the search request to FastAPI engine
    // Assuming FastAPI runs on localhost:8000
    const fastapiUrl = process.env.AI_ENGINE_URL || "http://localhost:8000";
    
    const response = await fetch(`${fastapiUrl}/ai/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, query, limit }),
    });

    if (!response.ok) {
      logger.error(`FastAPI search returned ${response.status}`);
      return NextResponse.json({ error: "AI Engine search failed" }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error searching knowledge base:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

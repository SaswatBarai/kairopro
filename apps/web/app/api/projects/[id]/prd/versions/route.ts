import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    
    const versions = await db.pRDVersion.findMany({
      where: { projectId },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        generatedBy: true,
        changeSummary: true,
        createdAt: true
      }
    });

    return NextResponse.json({ versions });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

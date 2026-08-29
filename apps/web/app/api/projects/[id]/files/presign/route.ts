import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPresignedUploadUrl } from "@/lib/storage";
import { z } from "zod";

const presignSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const userId = (session.user as any).id;

    // Verify project access
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
          { organization: { members: { some: { userId } } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or forbidden" }, { status: 404 });
    }

    const body = await req.json();
    const result = presignSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { filename, contentType } = result.data;
    
    // Generate a unique object key to avoid collisions
    const uniqueId = crypto.randomUUID();
    const extension = filename.split('.').pop();
    const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const objectKey = `projects/${projectId}/documents/${uniqueId}-${safeFilename}`;

    const uploadUrl = await getPresignedUploadUrl(objectKey, contentType);

    logger.info(`Generated presigned URL for ${objectKey}`);

    return NextResponse.json({ uploadUrl, objectKey });
  } catch (error) {
    logger.error("Error generating presigned URL:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

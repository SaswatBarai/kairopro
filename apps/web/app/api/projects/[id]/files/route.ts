import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { documentQueue } from "@/lib/queue";
import { z } from "zod";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const userId = (session.user as any).id;

    // Validate access
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [{ createdById: userId }, { members: { some: { userId } } }, { organization: { members: { some: { userId } } } }],
      },
    });

    if (!project) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const documents = await db.document.findMany({
      where: { projectId },
      include: {
        uploadedBy: { select: { name: true, email: true, image: true } },
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Serialize BigInt correctly
    const serializedDocs = documents.map(doc => ({
      ...doc,
      fileSize: doc.fileSize.toString(),
    }));

    return NextResponse.json({ documents: serializedDocs });
  } catch (error) {
    logger.error("Error fetching files:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const confirmUploadSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
  objectKey: z.string(),
  size: z.number().positive(),
});

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

    const body = await req.json();
    const result = confirmUploadSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { filename, contentType, objectKey, size } = result.data;

    // Create Document record
    const document = await db.document.create({
      data: {
        projectId,
        uploadedById: userId,
        filename: filename.replace(/[^a-zA-Z0-9.\-_]/g, "_"),
        originalFilename: filename,
        contentType,
        storagePath: objectKey,
        fileSize: size,
        processingStatus: "pending",
      },
    });

    // Enqueue document processing job
    await documentQueue.add("process-document", {
      documentId: document.id,
      projectId,
    });
    
    logger.info(`Document ${document.id} enqueued for processing in project ${projectId}`);

    return NextResponse.json({
      document: {
        ...document,
        fileSize: document.fileSize.toString(),
      }
    }, { status: 201 });
  } catch (error) {
    logger.error("Error confirming file upload:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

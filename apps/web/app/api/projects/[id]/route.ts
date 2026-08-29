import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;

    const project = await db.project.findFirst({
      where: {
        id,
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
          { organization: { members: { some: { userId } } } },
        ],
      },
      include: {
        organization: true,
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        documents: true,
        deployments: { orderBy: { createdAt: "desc" }, take: 5 },
        workspace: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    logger.error("Error getting project details:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const body = await req.json();

    const existingProject = await db.project.findFirst({
      where: {
        id,
        OR: [
          { createdById: userId },
          { members: { some: { userId, role: { in: ["owner", "admin"] } } } },
        ],
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found or insufficient permissions" },
        { status: 404 }
      );
    }

    const updated = await db.project.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.state ? { state: body.state } : {}),
      },
    });

    logger.info(`Project updated: ${updated.id}`);
    return NextResponse.json({ project: updated });
  } catch (error) {
    logger.error("Error updating project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;

    const existingProject = await db.project.findFirst({
      where: {
        id,
        OR: [
          { createdById: userId },
          { members: { some: { userId, role: "owner" } } },
        ],
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found or only owners can delete" },
        { status: 403 }
      );
    }

    await db.project.delete({ where: { id } });

    logger.info(`Project deleted: ${id}`);
    return NextResponse.json({ success: true, message: "Project deleted" });
  } catch (error) {
    logger.error("Error deleting project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}

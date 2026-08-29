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

    const org = await db.organization.findFirst({
      where: {
        id,
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        projects: {
          orderBy: { updatedAt: "desc" },
        },
        subscriptions: {
          include: { plan: true },
        },
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({ organization: org });
  } catch (error) {
    logger.error("Error getting organization details:", error);
    return NextResponse.json({ error: "Failed to fetch organization" }, { status: 500 });
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

    const isOwnerOrAdmin = await db.organizationMember.findFirst({
      where: {
        organizationId: id,
        userId,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!isOwnerOrAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.organization.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name } : {}),
      },
    });

    return NextResponse.json({ organization: updated });
  } catch (error) {
    logger.error("Error updating organization:", error);
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
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

    const isOwner = await db.organizationMember.findFirst({
      where: {
        organizationId: id,
        userId,
        role: "owner",
      },
    });

    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: Only owners can delete orgs" }, { status: 403 });
    }

    await db.organization.delete({ where: { id } });
    logger.info(`Organization deleted: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting organization:", error);
    return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 });
  }
}

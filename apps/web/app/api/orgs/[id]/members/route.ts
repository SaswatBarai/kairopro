import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { z } from "zod";

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "admin", "member"]).default("member"),
});

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

    const memberCheck = await db.organizationMember.findFirst({
      where: { organizationId: id, userId },
    });

    if (!memberCheck) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await db.organizationMember.findMany({
      where: { organizationId: id },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({ members });
  } catch (error) {
    logger.error("Error fetching org members:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const currentUserId = (session.user as any).id;
    const body = await req.json();

    const result = inviteMemberSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { email, role } = result.data;

    // Check if current user is owner or admin
    const currentMember = await db.organizationMember.findFirst({
      where: { organizationId: id, userId: currentUserId, role: { in: ["owner", "admin"] } },
      include: { organization: true },
    });

    if (!currentMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find target user
    const targetUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User with this email not registered yet" },
        { status: 404 }
      );
    }

    // Check existing membership
    const existing = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: id, userId: targetUser.id } },
    });

    if (existing) {
      return NextResponse.json({ error: "User is already a member" }, { status: 400 });
    }

    const newMember = await db.organizationMember.create({
      data: {
        organizationId: id,
        userId: targetUser.id,
        role,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    // Send notification email
    sendEmail({
      to: targetUser.email,
      subject: `You've been added to ${currentMember.organization.name}`,
      html: `<p>Hi ${targetUser.name},</p><p>You have been added to <strong>${currentMember.organization.name}</strong> as a <strong>${role}</strong>.</p>`,
    }).catch((err) => logger.error("Failed to send org invite email:", err));

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error) {
    logger.error("Error adding org member:", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
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
    const currentUserId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json({ error: "userId parameter required" }, { status: 400 });
    }

    const currentMember = await db.organizationMember.findFirst({
      where: { organizationId: id, userId: currentUserId, role: { in: ["owner", "admin"] } },
    });

    if (!currentMember && currentUserId !== targetUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.organizationMember.delete({
      where: { organizationId_userId: { organizationId: id, userId: targetUserId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error removing org member:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}

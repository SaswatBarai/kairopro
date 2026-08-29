import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { z } from "zod";

const createOrgSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const orgMemberships = await db.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: { projects: true, members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const organizations = orgMemberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));

    return NextResponse.json({ organizations });
  } catch (error) {
    logger.error("Error fetching organizations:", error);
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const result = createOrgSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name } = result.data;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Math.random().toString(36).substring(2, 6)}`;

    const org = await db.organization.create({
      data: {
        name,
        slug,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "owner",
          },
        },
      },
      include: {
        members: true,
      },
    });

    logger.info(`Organization created: ${org.name} (${org.id}) by user ${userId}`);

    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (error) {
    logger.error("Error creating organization:", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}

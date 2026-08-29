import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters"),
  description: z.string().optional(),
  organizationId: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    const projects = await db.project.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
          { organization: { members: { some: { userId } } } },
        ],
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: {
          select: { documents: true, deployments: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    logger.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
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
    const result = createProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, organizationId } = result.data;

    // Determine target organization
    let targetOrgId = organizationId;

    if (!targetOrgId) {
      // Find or create default user organization
      const userOrg = await db.organizationMember.findFirst({
        where: { userId },
        select: { organizationId: true },
      });

      if (userOrg) {
        targetOrgId = userOrg.organizationId;
      } else {
        // Create org for user
        const newOrg = await db.organization.create({
          data: {
            name: `${session.user.name ?? "User"}'s Workspace`,
            slug: `workspace-${userId.slice(-5)}`,
            ownerId: userId,
            members: {
              create: { userId, role: "owner" },
            },
          },
        });
        targetOrgId = newOrg.id;
      }
    }

    // Generate unique slug
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const uniqueSlug = `${baseSlug || "project"}-${Math.random().toString(36).substring(2, 7)}`;

    const project = await db.project.create({
      data: {
        name,
        slug: uniqueSlug,
        description,
        organizationId: targetOrgId,
        createdById: userId,
        state: "draft",
        members: {
          create: {
            userId,
            role: "owner",
          },
        },
      },
      include: {
        organization: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    logger.info(`Project created: ${project.name} (${project.id}) by user ${userId}`);

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    logger.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

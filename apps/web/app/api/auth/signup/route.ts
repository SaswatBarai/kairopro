import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, name } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and personal organization in transaction
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: name ?? normalizedEmail.split("@")[0],
        },
      });

      // Create personal org slug
      const baseSlug = (name || normalizedEmail.split("@")[0])
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const orgSlug = `${baseSlug || "user"}-${newUser.id.slice(-5)}`;

      const org = await tx.organization.create({
        data: {
          name: `${newUser.name}'s Org`,
          slug: orgSlug,
          ownerId: newUser.id,
          members: {
            create: {
              userId: newUser.id,
              role: "owner",
            },
          },
        },
      });

      // Assign free subscription plan if present
      const freePlan = await tx.subscriptionPlan.findUnique({
        where: { id: "free" },
      });

      if (freePlan) {
        await tx.subscription.create({
          data: {
            organizationId: org.id,
            planId: freePlan.id,
            status: "active",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          },
        });
      }

      return newUser;
    });

    logger.info(`User registered successfully: ${user.email} (${user.id})`);

    // Send welcome email asynchronously via MailHog
    sendEmail({
      to: user.email,
      subject: "Welcome to KairoPro!",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #6366f1;">Welcome to KairoPro, ${user.name}!</h1>
          <p>Your account has been created. You can now build, test, and ship AI-powered web applications.</p>
          <p>Get started by creating your first project on the dashboard.</p>
        </div>
      `,
    }).catch((err) => logger.error("Failed to send welcome email:", err));

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { RegisterInputSchema } from "@kairopro/contracts";
import {
  ConflictError,
  db,
  hashPassword,
  ValidationError,
} from "@kairopro/core";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = RegisterInputSchema.safeParse(body);

    if (!parseResult.success) {
      const error = new ValidationError({
        message: "Invalid registration payload",
        details: parseResult.error.flatten(),
      });
      return NextResponse.json(error.toJSON(), { status: error.status });
    }

    const { name, email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      const error = new ConflictError({
        message: "A user with this email address already exists.",
      });
      return NextResponse.json(error.toJSON(), { status: error.status });
    }

    const passwordHash = hashPassword(password);

    // Create User, Organization, and Membership atomically in a single transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
        },
      });

      const org = await tx.organization.create({
        data: {
          name: `${name}'s Org`,
          memberships: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
      });

      return { user, org };
    });

    return NextResponse.json(
      {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        orgId: result.org.id,
        createdAt: result.user.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "Failed to register user." },
      },
      { status: 500 },
    );
  }
}

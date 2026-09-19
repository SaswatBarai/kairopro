import { NextResponse } from "next/server";
import { RegisterInputSchema } from "@kairopro/contracts";
import {
  ConflictError,
  ValidationError,
  createPersonalOrg,
  db,
  hashPassword,
} from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = RegisterInputSchema.safeParse(body);

    if (!parseResult.success) {
      throw new ValidationError({
        message: "Invalid registration payload",
        details: parseResult.error.flatten(),
      });
    }

    const { name, email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictError({
        message: "A user with this email address already exists.",
      });
    }

    const passwordHash = hashPassword(password);

    // User, org, and owner membership are created atomically — a partial
    // failure must not leave an orphan user with no org to create in.
    // createPersonalOrg is the same seam auth.ts uses for OAuth signup, so
    // "create a personal org" has exactly one implementation.
    const { user, org } = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email: normalizedEmail, passwordHash },
      });
      const org = await createPersonalOrg(user.id, user.name, tx);
      return { user, org };
    });

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        orgId: org.id,
        createdAt: user.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}

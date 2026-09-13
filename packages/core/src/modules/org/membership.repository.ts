import { db } from "../../platform/db/client";

export async function findMembership(orgId: string, userId: string) {
  return db.membership.findUnique({
    where: {
      orgId_userId: {
        orgId,
        userId,
      },
    },
    include: {
      org: true,
    },
  });
}

export async function listUserMemberships(userId: string) {
  return db.membership.findMany({
    where: { userId },
    include: { org: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createMembership(data: {
  orgId: string;
  userId: string;
  role?: "OWNER" | "ADMIN" | "MEMBER";
}) {
  return db.membership.create({
    data: {
      orgId: data.orgId,
      userId: data.userId,
      role: data.role ?? "MEMBER",
    },
  });
}

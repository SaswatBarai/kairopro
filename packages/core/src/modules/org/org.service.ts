import { db } from "../../platform/db/client";

export async function createPersonalOrg(
  userId: string,
  userName?: string,
  tx?: Parameters<Parameters<typeof db.$transaction>[0]>[0],
) {
  const client = tx ?? db;
  const orgName = userName ? `${userName}'s Org` : "Personal Org";

  const org = await client.organization.create({
    data: {
      name: orgName,
      memberships: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
  });

  return org;
}

export async function getPrimaryOrgForUser(userId: string) {
  const membership = await db.membership.findFirst({
    where: { userId },
    include: { org: true },
    orderBy: { createdAt: "asc" },
  });

  return membership?.org ?? null;
}

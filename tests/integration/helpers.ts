import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@kairopro/db";
import { TEST_DATABASE_URL } from "./env";

/** A client bound to the throwaway test database — never the dev one. */
export function testDb(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }),
  });
}

/** Wipe every table between tests. Order only matters for SetNull edges. */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.internalError.deleteMany();
  await prisma.buildLog.deleteMany();
  await prisma.usageEvent.deleteMany();
  await prisma.build.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.version.deleteMany();
  await prisma.spec.deleteMany();
  await prisma.input.deleteMany();
  await prisma.project.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

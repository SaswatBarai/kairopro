import { PrismaClient } from "@prisma/client";

// One client per process. In development Next reloads modules on every edit,
// which would otherwise open a new connection pool each time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

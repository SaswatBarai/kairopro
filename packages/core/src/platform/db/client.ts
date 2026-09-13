import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@kairopro/db";

/**
 * The database singleton — the only PrismaClient construction in the repo.
 *
 * One instance per process. During development hot reload, the instance is
 * stashed on globalThis so a new module graph reuses the same connection
 * pool instead of leaking one per reload.
 */

const globalForDb = globalThis as unknown as { __kairoproDb?: PrismaClient };

function createDb(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set — load the root .env before constructing the database client.",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const db: PrismaClient = globalForDb.__kairoproDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__kairoproDb = db;
}

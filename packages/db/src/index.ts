/**
 * @kairopro/db
 *
 * Owns the Prisma schema, migrations, seed, and the generated client.
 * Re-exports the generated client; the runtime singleton lives in
 * @kairopro/core (platform/db/client.ts) — the only place a PrismaClient
 * is ever constructed.
 *
 * The generated client is gitignored and recreated by `pnpm db:generate`
 * (turbo runs it as this package's build task before downstream typecheck).
 */
export * from "./generated/prisma/client";

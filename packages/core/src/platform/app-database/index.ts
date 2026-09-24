import { db } from "../db/client";

/**
 * A generated project's own database — the one its `prisma db push`, its
 * integration tests, and (later) its running preview use. Never the
 * platform's database: that push runs with `--accept-data-loss`, so pointing
 * it at `DATABASE_URL` would drop the platform's own tables.
 *
 * One database per project on the same Postgres server the platform uses in
 * development. `KAIROPRO_APP_DB_HOST` overrides the host in the URL handed
 * to the project — needed when its commands run in a container that reaches
 * the server under a different name than the platform does.
 */

const NAME_RE = /^kairopro_app_[a-z0-9_]+$/;

export function appDatabaseName(projectId: string): string {
  const name = `kairopro_app_${projectId.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
  // Postgres identifiers max out at 63 bytes; and this name is interpolated
  // into DDL below, so it must be provably a plain identifier.
  if (!NAME_RE.test(name) || name.length > 63) {
    throw new Error(`Cannot derive a database name for project "${projectId}"`);
  }
  return name;
}

export function appDatabaseUrl(
  projectId: string,
  platformUrl: string | undefined = process.env.DATABASE_URL,
  host: string | undefined = process.env.KAIROPRO_APP_DB_HOST,
): string {
  if (!platformUrl) {
    throw new Error(
      "DATABASE_URL is not set — cannot derive a project database.",
    );
  }
  const url = new URL(platformUrl);
  url.pathname = `/${appDatabaseName(projectId)}`;
  url.search = "";
  if (host) url.hostname = host;
  return url.toString();
}

/** Creates the project's database if it doesn't exist. Idempotent. */
export async function ensureAppDatabase(projectId: string): Promise<string> {
  const name = appDatabaseName(projectId);
  const existing = await db.$queryRawUnsafe<unknown[]>(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    name,
  );
  if (existing.length === 0) {
    await db.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  }
  return appDatabaseUrl(projectId);
}

/** Drops the project's database, disconnecting anything still using it. */
export async function dropAppDatabase(projectId: string): Promise<void> {
  const name = appDatabaseName(projectId);
  await db.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
}

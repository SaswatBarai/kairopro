import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { TEST_DATABASE_NAME, TEST_DATABASE_URL, serverConnection } from "./env";

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPackageDir = path.resolve(here, "../../packages/db");

/** Drop and recreate the throwaway database, then apply all migrations. */
async function recreateTestDatabase(): Promise<void> {
  const client = new Client({ ...serverConnection(), database: "postgres" });
  await client.connect();
  try {
    await client.query(
      `DROP DATABASE IF EXISTS ${TEST_DATABASE_NAME} WITH (FORCE)`,
    );
    await client.query(`CREATE DATABASE ${TEST_DATABASE_NAME}`);
  } finally {
    await client.end();
  }

  // prisma.config.ts dotenv-loads the root .env, but dotenv never overrides
  // variables that are already set — so DATABASE_URL below wins.
  execSync("pnpm exec prisma migrate deploy", {
    cwd: dbPackageDir,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}

export async function setup(): Promise<void> {
  await recreateTestDatabase();
}

export async function teardown(): Promise<void> {
  const client = new Client({ ...serverConnection(), database: "postgres" });
  await client.connect();
  try {
    await client.query(
      `DROP DATABASE IF EXISTS ${TEST_DATABASE_NAME} WITH (FORCE)`,
    );
  } finally {
    await client.end();
  }
}

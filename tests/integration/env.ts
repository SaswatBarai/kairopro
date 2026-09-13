import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Integration tests never touch the dev database. They run against a
// throwaway database (kairopro_test) on the same engine, recreated from
// scratch on every run. The URL is derived from the root .env DATABASE_URL
// by swapping the database name — everything else (host, credentials) is
// shared with the compose stack in docker/.
const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../../.env") });

export const TEST_DATABASE_NAME = "kairopro_test";

export const DEV_DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://kairopro:kairopro@localhost:5432/kairopro_dev";

export const TEST_DATABASE_URL = withDatabase(
  DEV_DATABASE_URL,
  TEST_DATABASE_NAME,
);

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

/** Connection options for the server's maintenance database. */
export function serverConnection(): {
  host: string;
  port: number;
  user: string;
  password: string;
} {
  const parsed = new URL(DEV_DATABASE_URL);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
  };
}

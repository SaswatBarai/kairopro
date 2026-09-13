import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Single root .env. Do not add a second .env in this package —
// diverging copies are how migrations end up pointed at the wrong database.
const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../../.env") });

export default defineConfig({
  // Required for migration and introspection commands. dotenv above has
  // already populated process.env by the time env() reads it.
  datasource: { url: env("DATABASE_URL") },
  schema: path.join(here, "prisma", "schema.prisma"),
  migrations: {
    path: path.join(here, "prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});

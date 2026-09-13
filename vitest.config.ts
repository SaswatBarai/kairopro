import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./tests/integration/env";

// Cross-package integration tests (README §Structure: tests/). Package-level
// unit tests live in each workspace package and run via `turbo test`.
//
// The throwaway database is created, migrated, and dropped by the global
// setup — `pnpm test` at the root never touches kairopro_dev.
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["./tests/integration/global-setup.ts"],
    env: {
      // Anything that reads DATABASE_URL inside a test (e.g. the core
      // singleton) must land on the throwaway database, never the dev one.
      DATABASE_URL: TEST_DATABASE_URL,
    },
  },
});

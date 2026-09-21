import { defineConfig } from "vitest/config";

// Unit and integration tests only — e2e runs through Playwright instead
// (`playwright.config.ts`), never through this config.
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/__tests__/unit/**/*.test.ts",
      "src/__tests__/integration/**/*.test.ts",
    ],
  },
});

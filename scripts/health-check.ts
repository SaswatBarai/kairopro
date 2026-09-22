#!/usr/bin/env tsx
/**
 * Standalone health probe entry point (Phase 19 / BE-11) — same rationale
 * as `cleanup-inactive.ts`: for an external cron, independent of the
 * in-process scheduler. Exits non-zero when any container is unhealthy, so
 * a cron wrapper can alert on it directly without parsing output.
 *
 * Usage: pnpm health-check
 */
import { runHealthProbe } from "@kairopro/core";

async function main(): Promise<void> {
  const result = await runHealthProbe();
  if (result.unhealthy.length === 0) {
    console.log("health-check: all containers healthy");
    return;
  }

  console.error(
    `health-check: ${result.unhealthy.length} unhealthy project(s)`,
  );
  console.error(result.unhealthy.map((id) => `  - ${id}`).join("\n"));
  process.exitCode = 1;
}

main().catch((err) => {
  console.error("health-check script failed:", err);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Standalone cleanup entry point (Phase 19 / BE-11) — for an external cron
 * or systemd timer, independent of the in-process scheduler
 * (`platform/jobs/bootstrap.ts`, wired into `apps/web`'s server process).
 * Runs `cleanup-inactive` then `cleanup-orphans` and exits non-zero if
 * either sweep hits an error it couldn't recover from on its own (each
 * per-container failure is caught and logged individually inside the job —
 * this script only fails on something outside that, e.g. the database
 * itself being unreachable).
 *
 * Usage: pnpm cleanup-inactive
 */
import { runCleanupInactive, runCleanupOrphans } from "@kairopro/core";

async function main(): Promise<void> {
  const inactive = await runCleanupInactive();
  console.log(
    `cleanup-inactive: stopped ${inactive.stopped.length} container(s)`,
  );
  if (inactive.stopped.length > 0) {
    console.log(inactive.stopped.map((id) => `  - ${id}`).join("\n"));
  }

  const orphans = await runCleanupOrphans();
  console.log(
    `cleanup-orphans: removed ${orphans.removed.length} container(s)`,
  );
  if (orphans.removed.length > 0) {
    console.log(orphans.removed.map((id) => `  - ${id}`).join("\n"));
  }
}

main().catch((err) => {
  console.error("cleanup-inactive script failed:", err);
  process.exit(1);
});

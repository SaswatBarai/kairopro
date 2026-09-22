import { runCleanupInactive } from "./definitions/cleanup-inactive";
import { runCleanupOrphans } from "./definitions/cleanup-orphans";
import { runHealthProbe } from "./definitions/health-probe";
import { runPruneLogs } from "./definitions/prune-logs";
import { scheduler } from "./scheduler";

/**
 * Registers the standing cleanup/health jobs with the in-process scheduler
 * (Phase 19 / BE-11). Call once at process start (`apps/web`'s
 * `instrumentation.ts`) — registering twice throws (`Scheduler.register`
 * rejects a duplicate id), so this is not itself idempotent.
 */
export function registerJobs(): void {
  scheduler.register("cleanup-inactive", 15 * 60 * 1000, async () => {
    await runCleanupInactive();
  });
  scheduler.register("cleanup-orphans", 60 * 60 * 1000, async () => {
    await runCleanupOrphans();
  });
  scheduler.register("health-probe", 5 * 60 * 1000, async () => {
    await runHealthProbe();
  });
  scheduler.register("prune-logs", 24 * 60 * 60 * 1000, async () => {
    await runPruneLogs();
  });
}

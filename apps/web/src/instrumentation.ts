/**
 * Next.js instrumentation hook — runs once per server process start. Wires
 * up the standing cleanup/health jobs (Phase 19 / BE-11) so idle preview
 * containers, orphaned containers, and old build logs are swept without a
 * separate worker process. The Edge runtime never reaches this file's body
 * because of the `runtime` check; only the Node.js server process does.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { registerJobs } = await import("@kairopro/core");
  registerJobs();
}

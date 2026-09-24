const key = (projectId: string) => `kairopro:lastSetupPath:${projectId}`;

/** First step of the setup wizard — where you land with no progress. */
export const SETUP_ENTRY = "/projects/new";

export function rememberSetupStep(projectId: string, pathname: string): void {
  try {
    localStorage.setItem(key(projectId), pathname);
  } catch {
    // Storage unavailable: resuming falls back to the first step.
  }
}

/** Where "Continue setup" should go: the wizard step this project was last
 * on, else the first step. Read at click time (localStorage is client-only). */
export function resumeSetupHref(projectId: string): string {
  let path = SETUP_ENTRY;
  try {
    const stored = localStorage.getItem(key(projectId));
    // The build used to be a wizard step; it is now the project's own page.
    // A browser that last saw the old step still has it stored.
    if (
      stored === "/projects/new/build" ||
      stored === "/projects/new/build/complete"
    ) {
      return `/projects/${encodeURIComponent(projectId)}/build`;
    }
    // Only ever navigate within the wizard, whatever storage contains.
    if (stored && /^\/projects\/new(\/[a-z-]+)*$/.test(stored)) path = stored;
  } catch {
    // fall through to the first step
  }
  return `${path}?projectId=${encodeURIComponent(projectId)}`;
}

/**
 * RequestContext — the ambient identity every service call receives.
 *
 * Placeholder type in Phase 1 (BE-1). Phase 3 (BE-3) implements the real
 * builder: it reads the NextAuth session and resolves the active org,
 * throwing when either is missing. Services never read `next/headers`
 * themselves — the web app constructs this object at the route boundary.
 */
export interface RequestContext {
  userId: string;
  orgId: string;
}

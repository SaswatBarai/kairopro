/**
 * RequestContext — the boundary object passed from web routes into core services.
 * `apps/web` builds this from the NextAuth session.
 * `@kairopro/core` services accept it as their first parameter.
 * `packages/core` MUST NOT import anything from `next`.
 */
export interface RequestContext {
  userId: string;
  orgId: string;
}

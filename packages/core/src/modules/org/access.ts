import type { RequestContext } from "../../lib/context";
import { NotFoundError } from "../../lib/errors";
import { db } from "../../platform/db/client";
import { findMembership } from "./membership.repository";

/**
 * Resolves project access via RequestContext.orgId.
 * CRITICAL TENANT ISOLATION RULE:
 * If the project does not exist OR does not belong to ctx.orgId OR the user
 * is not a member of ctx.orgId, this function returns `null`.
 *
 * Routes must map a null return to a 404 NOT_FOUND error (never 403 FORBIDDEN)
 * to prevent leaking the existence of foreign projects across tenants.
 */
export async function ownerOf(projectId: string, ctx: RequestContext) {
  if (!ctx.orgId || !ctx.userId) return null;

  // Verify caller membership in ctx.orgId
  const membership = await findMembership(ctx.orgId, ctx.userId);
  if (!membership) return null;

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      orgId: ctx.orgId,
    },
  });

  return project;
}

/**
 * Verifies if user can edit a project. Same security boundary as ownerOf.
 */
export async function canEdit(projectId: string, ctx: RequestContext) {
  const project = await ownerOf(projectId, ctx);
  return Boolean(project);
}

/**
 * Asserts that the RequestContext caller belongs to the given orgId.
 * Throws NotFoundError if assertion fails to avoid leaking org existence.
 */
export async function assertMember(orgId: string, ctx: RequestContext) {
  if (ctx.orgId !== orgId) {
    throw new NotFoundError({ message: "Organization not found" });
  }

  const membership = await findMembership(orgId, ctx.userId);
  if (!membership) {
    throw new NotFoundError({ message: "Organization not found" });
  }

  return membership;
}

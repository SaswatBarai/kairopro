import { getServerSession } from "next-auth";
import { type RequestContext, UnauthorizedError } from "@kairopro/core";
import { authOptions } from "@/lib/auth";

export type { RequestContext } from "@kairopro/core";

/**
 * Builds RequestContext from the active NextAuth session.
 * Throws UnauthorizedError if no valid session or org is active.
 * Routes call this at the boundary before passing context into domain services.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session?.user?.orgId) {
    throw new UnauthorizedError({ message: "Authentication required" });
  }

  return {
    userId: session.user.id,
    orgId: session.user.orgId,
  };
}

/**
 * @kairopro/core
 *
 * Domain modules and platform seams. Server-only.
 *
 * This package deliberately has NO `next` dependency. That is the structural
 * enforcement of the boundary rule: importing `next/headers` or any other
 * framework module from here fails to resolve rather than relying on review
 * or an ESLint rule that can be disabled.
 *
 * The web app reads the session and passes a RequestContext in.
 *
 * Populated across Phase 1 … Phase 20 (legacy BE-1 … BE-11, AI-1 … AI-9).
 */

export { db } from "./platform/db/client";
export type { PrismaClient } from "@kairopro/db";

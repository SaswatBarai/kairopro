import type { RequestContext } from "../../lib/context";
import { ProviderError } from "../../lib/errors";

/**
 * Stub-first seam (§5 of the backend/AI plan): the generation route this
 * phase ships against is defined now; the real implementation lands with
 * AI-5 (Phase 11) as `packages/core/src/modules/agent/workflow/steps/*`.
 * Swapping the selector below is the only change AI-5 needs to make here.
 */
export interface SpecGenerator {
  generate(projectId: string, ctx: RequestContext): Promise<void>;
}

export const StubSpecGenerator: SpecGenerator = {
  async generate() {
    throw new ProviderError({
      message: "Spec generation is not available yet",
    });
  },
};

export function getSpecGenerator(): SpecGenerator {
  return StubSpecGenerator;
}

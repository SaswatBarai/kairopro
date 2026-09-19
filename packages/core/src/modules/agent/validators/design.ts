import { z } from "zod";

/**
 * Design content schema (Phase 11 / AI-5) — shared with BE-6. Only the DB
 * envelope shape lives here (a non-empty `DESIGN.md` document string);
 * whether it has real, non-empty tokens and exports to non-empty CSS is a
 * stronger check enforced separately, using `design.service.ts` (BE-6),
 * inside `workflow/steps/generate-design.ts`'s retry loop.
 */
export const DesignContentSchema = z.object({
  /** The full `DESIGN.md` document: YAML token frontmatter + markdown body. */
  markdown: z.string().min(1),
});

export type DesignContent = z.infer<typeof DesignContentSchema>;

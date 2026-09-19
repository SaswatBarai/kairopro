import { z } from "zod";

/**
 * Data model content schema (Phase 11 / AI-5) — shared with BE-6. Only the
 * DB envelope shape lives here (a non-empty Prisma-source string); whether
 * that string actually *parses* as Prisma is a stronger check than Zod can
 * express and is enforced separately, against the real Prisma CLI, inside
 * `workflow/steps/generate-data-model.ts`'s retry loop.
 */
export const DataModelContentSchema = z.object({
  /** Raw Prisma DSL — `model`/`enum` blocks only, no datasource/generator. */
  schema: z.string().min(1),
});

export type DataModelContent = z.infer<typeof DataModelContentSchema>;

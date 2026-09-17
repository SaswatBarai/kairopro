import { z } from "zod";
import { MAX_UPLOAD_BYTES, UploadMimeTypeSchema } from "./upload";

export const InputKindSchema = z.enum(["TEXT", "FILE"]);

/** Re-exported so the Phase 0 import surface keeps working — the canonical
 * home is upload.ts. */
export * from "./upload";

/**
 * A stored input. `storedName` (the object key) is deliberately absent: it
 * is server-internal and never crosses a route boundary. `originalName` and
 * `mimeType` are null for TEXT inputs; `extraction` holds extracted text for
 * pdf/docx (and the text itself for TEXT inputs).
 */
export const InputSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  kind: InputKindSchema,
  originalName: z.string().nullable(),
  mimeType: UploadMimeTypeSchema.nullable(),
  sizeBytes: z.number().int().nonnegative().max(MAX_UPLOAD_BYTES),
  extraction: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export const InputListSchema = z.array(InputSchema);

/** Creating/upserting a project's requirements text. The service treats
 * this as the project's single TEXT input (update, not append). */
export const MAX_INPUT_TEXT_CHARS = 50_000;
export const CreateTextInputSchema = z.object({
  kind: z.literal("TEXT"),
  text: z.string().trim().min(1).max(MAX_INPUT_TEXT_CHARS),
});

export type InputKind = z.infer<typeof InputKindSchema>;
export type Input = z.infer<typeof InputSchema>;
export type InputList = z.infer<typeof InputListSchema>;
export type CreateTextInput = z.infer<typeof CreateTextInputSchema>;

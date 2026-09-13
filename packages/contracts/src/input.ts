import { z } from "zod";

export const InputKindSchema = z.enum(["TEXT", "FILE"]);

/**
 * Upload constraints shared with the frontend: the input step rejects
 * anything outside this list before the request is ever made.
 */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/svg+xml",
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_INPUT_FILES_PER_PROJECT = 5;

export const UploadMimeTypeSchema = z.enum(ALLOWED_UPLOAD_MIME_TYPES);

/**
 * A stored input. `storedName` (the on-disk object key) is deliberately
 * absent: it is server-internal and never crosses a route boundary.
 * `originalName` and `mimeType` are null for TEXT inputs; `extraction`
 * holds extracted text for pdf/docx (and the text itself for TEXT inputs).
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

export type InputKind = z.infer<typeof InputKindSchema>;
export type UploadMimeType = z.infer<typeof UploadMimeTypeSchema>;
export type Input = z.infer<typeof InputSchema>;
export type InputList = z.infer<typeof InputListSchema>;

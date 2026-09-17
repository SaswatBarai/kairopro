import { z } from "zod";

/**
 * Upload constraints — the single source shared by the frontend (the input
 * step rejects before the request is made) and the backend (the route and
 * storage layer enforce them again — never trust the client).
 *
 * Canonical home since Phase 5 (BE-5); `input.ts` re-exports for
 * compatibility with the Phase 0 surface.
 */

/** Only these MIME types may be stored. Sniffed server-side, never trusted
 * from the client's declaration. */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/svg+xml",
] as const;

export const UploadMimeTypeSchema = z.enum(ALLOWED_UPLOAD_MIME_TYPES);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_INPUT_FILES_PER_PROJECT = 5;

/** What the file picker's `accept` attribute and the drop-zone copy show. */
export const ACCEPTED_FILE_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".png",
  ".jpg",
  ".svg",
] as const;

/** Extension appended to a generated (never client-supplied) stored name. */
export const EXTENSION_BY_MIME: Record<UploadMimeType, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
  "text/markdown": "md",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
};

export type UploadMimeType = z.infer<typeof UploadMimeTypeSchema>;

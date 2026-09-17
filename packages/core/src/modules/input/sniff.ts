import type { UploadMimeType } from "@kairopro/contracts";

/**
 * Content sniffing — the client-declared MIME type is never trusted (it is
 * trivially spoofable). The sniffed type drives both the allowlist decision
 * and the stored-name extension.
 */

const PDF_MAGIC = Buffer.from("%PDF-", "latin1");
const ZIP_MAGIC = Buffer.from("PK\x03\x04", "latin1");
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function startsWith(buffer: Buffer, magic: Buffer): boolean {
  return (
    buffer.length >= magic.length &&
    buffer.subarray(0, magic.length).equals(magic)
  );
}

function looksLikeText(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, 8192);
  if (sample.includes(0)) return false; // NUL byte → binary
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample);
    return true;
  } catch {
    return false;
  }
}

function looksLikeSvg(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 1024).toString("utf8");
  return /<svg[\s>]/i.test(head);
}

const MARKDOWN_MARKERS =
  /(^|\n)#{1,6} |\*\*[^*\n]+\*\*|`{3}|(^|\n)- \[|(^|\n)\| /;

/**
 * Detect the upload's real type from its bytes. Returns null for anything
 * outside the allowlist — the caller rejects those before storage.
 */
export function sniffMime(buffer: Buffer): UploadMimeType | null {
  if (buffer.length === 0) return null;
  if (startsWith(buffer, PDF_MAGIC)) return "application/pdf";
  // docx is a ZIP — the only ZIP-based type on the allowlist. Malformed or
  // non-docx zips fail later in extraction (best-effort null), never here.
  if (startsWith(buffer, ZIP_MAGIC)) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (startsWith(buffer, PNG_MAGIC)) return "image/png";
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (looksLikeText(buffer)) {
    if (looksLikeSvg(buffer)) return "image/svg+xml";
    if (MARKDOWN_MARKERS.test(buffer.subarray(0, 8192).toString("utf8"))) {
      return "text/markdown";
    }
    return "text/plain";
  }
  return null;
}

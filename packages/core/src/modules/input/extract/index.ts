import type { UploadMimeType } from "@kairopro/contracts";
import { extractDocx } from "./docx";
import { extractImage } from "./image";
import { extractPdf } from "./pdf";
import { extractText } from "./text";

/**
 * Extraction dispatch. Always best-effort: every extractor returns null on
 * failure instead of throwing — the input row is recorded with a null
 * extraction and the request still succeeds.
 */
export async function extractByMime(
  mime: UploadMimeType,
  buffer: Buffer,
): Promise<string | null> {
  switch (mime) {
    case "application/pdf":
      return extractPdf(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return extractDocx(buffer);
    case "text/plain":
    case "text/markdown":
      return extractText(buffer);
    case "image/png":
    case "image/jpeg":
    case "image/svg+xml":
      return extractImage(buffer);
  }
}

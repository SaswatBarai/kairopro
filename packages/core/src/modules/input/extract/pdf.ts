import { PDFParse } from "pdf-parse";

/** PDF text extraction (best-effort): a scanned PDF with no text layer, or
 * any corrupt file, returns null — never a failed request. */
export async function extractPdf(buffer: Buffer): Promise<string | null> {
  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}

import mammoth from "mammoth";

/** DOCX text extraction (best-effort): corrupt or non-docx ZIPs return null. */
export async function extractDocx(buffer: Buffer): Promise<string | null> {
  try {
    const { value } = await mammoth.extractRawText({ buffer });
    const text = value?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

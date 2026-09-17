/** Text extraction — TXT and MD are their own extraction; binary-looking
 * content yields null rather than garbage. */

export function extractText(buffer: Buffer): string | null {
  if (buffer.length === 0) return null;
  if (buffer.subarray(0, 8192).includes(0)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return null;
  }
}

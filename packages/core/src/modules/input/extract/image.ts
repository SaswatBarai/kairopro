/**
 * Images are NOT text-extracted. They are stored and passed through as
 * vision input to the model later (Phase 7+). The module exists to make the
 * dispatch table complete and the decision explicit.
 */
export function extractImage(_buffer: Buffer): null {
  return null;
}

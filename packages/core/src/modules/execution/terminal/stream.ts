/**
 * Incremental line splitter (Phase 14 / BE-9). A container's stdout/stderr
 * arrives as arbitrary byte chunks — a 4KB read can split a line in half at
 * the chunk boundary. This buffers the trailing partial line across `push`
 * calls instead of emitting it early, and only emits it via `flush()` once
 * the stream actually ends.
 */
export class LineSplitter {
  #buffer = "";
  readonly #onLine: (line: string) => void;

  constructor(onLine: (line: string) => void) {
    this.#onLine = onLine;
  }

  /** Feed a chunk of raw text. Complete lines are emitted immediately; a
   * trailing partial line (no `\n` yet) is held until the next chunk
   * completes it, or until `flush()`. */
  push(chunk: string): void {
    this.#buffer += chunk;
    const lines = this.#buffer.split("\n");
    this.#buffer = lines.pop() ?? "";
    for (const line of lines) this.#onLine(line);
  }

  /** Emits whatever partial line remains (a final line with no trailing
   * newline is still a real line). No-ops if the buffer is empty. */
  flush(): void {
    if (this.#buffer.length === 0) return;
    const remaining = this.#buffer;
    this.#buffer = "";
    this.#onLine(remaining);
  }
}

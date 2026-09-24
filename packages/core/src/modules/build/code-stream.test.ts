import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCodeStream, createFenceStripper } from "./code-stream";

// `emit` is injected in every test that emits; this only stops the real
// `emitLog` (default argument) from constructing a database client on import.
vi.mock("./logs", () => ({ emitLog: vi.fn() }));

function strip(chunks: string[]): string {
  const s = createFenceStripper();
  return chunks.map((c) => s.push(c)).join("") + s.end();
}

const CODE = "export const a = 1;\nexport const b = 2;";

describe("createFenceStripper", () => {
  it("passes unfenced text through unchanged", () => {
    expect(strip([CODE])).toBe(CODE);
  });

  it("removes an opening language fence and the closing fence", () => {
    expect(strip([`\`\`\`typescript\n${CODE}\n\`\`\``])).toBe(CODE);
  });

  it("removes an untagged fence and trailing whitespace after it", () => {
    expect(strip([`\`\`\`\n${CODE}\n\`\`\`\n`])).toBe(CODE);
  });

  it("leaves fenced blocks that are inside the file alone", () => {
    const doc = "// example:\n// ```ts\n// a\n// ```\nexport {};";
    expect(strip([doc])).toBe(doc);
  });

  it("does not strip a file that merely starts with a backtick", () => {
    const tpl = "`template`;\nexport {};";
    expect(strip([tpl])).toBe(tpl);
  });

  it("gives the same result wherever the chunk boundaries fall", () => {
    const fenced = `\`\`\`typescript\n${CODE}\n\`\`\`\n`;
    for (let i = 1; i < fenced.length; i++) {
      expect(strip([fenced.slice(0, i), fenced.slice(i)])).toBe(CODE);
    }
    // …and three-way splits, including one character at a time.
    for (let i = 1; i < fenced.length; i += 3) {
      for (let j = i + 1; j < fenced.length; j += 4) {
        expect(
          strip([fenced.slice(0, i), fenced.slice(i, j), fenced.slice(j)]),
        ).toBe(CODE);
      }
    }
    expect(strip(fenced.split(""))).toBe(CODE);
  });

  it("gives the same result for unfenced text at every split", () => {
    for (let i = 1; i < CODE.length; i++) {
      expect(strip([CODE.slice(0, i), CODE.slice(i)])).toBe(CODE);
    }
  });

  it("never shows the opening fence line while streaming", () => {
    const s = createFenceStripper();
    expect(s.push("```type")).toBe("");
    expect(s.push("script\n")).toBe("");
    expect(s.push("export const x = 1;\n".repeat(3))).not.toContain("```");
  });
});

describe("createCodeStream", () => {
  let events: Array<Record<string, unknown>>;
  const emit = vi.fn(async (_id: string, _type: string, content: string) => {
    events.push(JSON.parse(content).data);
  });

  beforeEach(() => {
    vi.useFakeTimers();
    events = [];
    emit.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("announces the file, batches text, and closes it", async () => {
    const stream = createCodeStream("b1", emit);
    stream.onCode("src/a.ts", { type: "reset" });
    stream.onCode("src/a.ts", { type: "delta", text: "export const " });
    stream.onCode("src/a.ts", { type: "delta", text: "a = 1;\n".repeat(3) });
    stream.onCode("src/a.ts", { type: "done", omitted: false });
    await stream.drain();

    expect(events[0]).toEqual({ file: "src/a.ts", reset: true });
    expect(events.at(-1)).toEqual({
      file: "src/a.ts",
      done: true,
      omitted: false,
    });
    const text = events
      .filter((e) => "content" in e)
      .map((e) => e.content)
      .join("");
    expect(text).toBe("export const a = 1;\na = 1;\na = 1;");
  });

  it("coalesces many deltas inside the flush window into one event", async () => {
    const stream = createCodeStream("b1", emit);
    stream.onCode("f.ts", { type: "reset" });
    for (let i = 0; i < 50; i++) {
      stream.onCode("f.ts", { type: "delta", text: `line ${i};\n` });
    }
    await vi.advanceTimersByTimeAsync(300);
    await stream.drain();

    const contentEvents = events.filter((e) => "content" in e);
    expect(contentEvents.length).toBeLessThan(5);
  });

  it("flushes early once enough text has accumulated", async () => {
    const stream = createCodeStream("b1", emit);
    stream.onCode("f.ts", { type: "reset" });
    stream.onCode("f.ts", { type: "delta", text: "x".repeat(2600) });
    await stream.drain();

    expect(events.filter((e) => "content" in e).length).toBeGreaterThan(0);
  });

  it("sends a reset when a repair starts, and drops the abandoned text", async () => {
    const stream = createCodeStream("b1", emit);
    stream.onCode("f.ts", { type: "reset" });
    stream.onCode("f.ts", { type: "delta", text: "broken attempt" });
    stream.onCode("f.ts", { type: "reset" });
    stream.onCode("f.ts", { type: "delta", text: "fixed version" });
    stream.onCode("f.ts", { type: "done", omitted: false });
    await stream.drain();

    const resets = events.filter((e) => "reset" in e);
    expect(resets).toHaveLength(2);
    const afterLastReset = events.slice(events.lastIndexOf(resets[1]!) + 1);
    expect(
      afterLastReset
        .filter((e) => "content" in e)
        .map((e) => e.content)
        .join(""),
    ).toBe("fixed version");
    expect(JSON.stringify(afterLastReset)).not.toContain("broken");
  });

  it("marks an omitted unit", async () => {
    const stream = createCodeStream("b1", emit);
    stream.onCode("f.ts", { type: "reset" });
    stream.onCode("f.ts", { type: "done", omitted: true });
    await stream.drain();

    expect(events.at(-1)).toEqual({ file: "f.ts", done: true, omitted: true });
  });

  it("keeps files independent", async () => {
    const stream = createCodeStream("b1", emit);
    stream.onCode("a.ts", { type: "reset" });
    stream.onCode("b.ts", { type: "reset" });
    stream.onCode("a.ts", { type: "delta", text: "AAAA" });
    stream.onCode("b.ts", { type: "delta", text: "BBBB" });
    stream.onCode("a.ts", { type: "done", omitted: false });
    stream.onCode("b.ts", { type: "done", omitted: false });
    await stream.drain();

    const textFor = (file: string) =>
      events
        .filter((e) => e.file === file && "content" in e)
        .map((e) => e.content)
        .join("");
    expect(textFor("a.ts")).toBe("AAAA");
    expect(textFor("b.ts")).toBe("BBBB");
  });

  it("drain sends text still buffered for a file that never finished", async () => {
    const stream = createCodeStream("b1", emit);
    stream.onCode("f.ts", { type: "reset" });
    stream.onCode("f.ts", { type: "delta", text: "y".repeat(50) });
    await stream.drain();

    expect(
      events
        .filter((e) => "content" in e)
        .map((e) => e.content)
        .join(""),
    ).toContain("y");
  });

  it("does not fail the caller when persisting an event fails", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("db down"));
    const stream = createCodeStream("b1", failing);

    stream.onCode("f.ts", { type: "reset" });
    stream.onCode("f.ts", { type: "done", omitted: false });

    await expect(stream.drain()).resolves.toBeUndefined();
    expect(failing).toHaveBeenCalled();
  });

  it("persists events in order", async () => {
    const order: string[] = [];
    const slowFirst = vi.fn(
      async (_id: string, _type: string, content: string) => {
        const data = JSON.parse(content).data;
        if ("reset" in data) await new Promise((r) => setTimeout(r, 50));
        order.push(
          "reset" in data ? "reset" : "done" in data ? "done" : "text",
        );
      },
    );
    const stream = createCodeStream("b1", slowFirst);

    stream.onCode("f.ts", { type: "reset" });
    stream.onCode("f.ts", { type: "done", omitted: false });
    const drained = stream.drain();
    await vi.advanceTimersByTimeAsync(100);
    await drained;

    expect(order).toEqual(["reset", "done"]);
  });
});

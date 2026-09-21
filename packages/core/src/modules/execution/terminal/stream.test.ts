import { describe, expect, it } from "vitest";
import { LineSplitter } from "./stream";

describe("LineSplitter (BE-9)", () => {
  it("emits a complete line delivered in a single push", () => {
    const lines: string[] = [];
    const splitter = new LineSplitter((line) => lines.push(line));

    splitter.push("hello world\n");

    expect(lines).toEqual(["hello world"]);
  });

  it("holds a partial line across chunk boundaries and completes it on the next push", () => {
    const lines: string[] = [];
    const splitter = new LineSplitter((line) => lines.push(line));

    splitter.push("hello ");
    expect(lines).toEqual([]); // not emitted early — no newline yet
    splitter.push("world\n");

    expect(lines).toEqual(["hello world"]);
  });

  it("splits multiple lines within one chunk", () => {
    const lines: string[] = [];
    const splitter = new LineSplitter((line) => lines.push(line));

    splitter.push("line1\nline2\nline3\n");

    expect(lines).toEqual(["line1", "line2", "line3"]);
  });

  it("a newline split exactly at the chunk boundary still produces one clean line", () => {
    const lines: string[] = [];
    const splitter = new LineSplitter((line) => lines.push(line));

    splitter.push("line1\n");
    splitter.push("line2\n");

    expect(lines).toEqual(["line1", "line2"]);
  });

  it("flush() emits a trailing partial line with no newline", () => {
    const lines: string[] = [];
    const splitter = new LineSplitter((line) => lines.push(line));

    splitter.push("no newline yet");
    splitter.flush();

    expect(lines).toEqual(["no newline yet"]);
  });

  it("flush() is a no-op when the buffer is already empty", () => {
    const lines: string[] = [];
    const splitter = new LineSplitter((line) => lines.push(line));

    splitter.push("complete\n");
    splitter.flush();

    expect(lines).toEqual(["complete"]);
  });
});

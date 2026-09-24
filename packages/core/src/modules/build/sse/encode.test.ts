import { describe, expect, it } from "vitest";
import {
  encodeEventContent,
  encodeKeepalive,
  encodeSseFrame,
  toStreamEvent,
} from "./encode";

describe("toStreamEvent (BE-10)", () => {
  it("maps STEP to status, parsing JSON content", () => {
    const ev = toStreamEvent({
      seq: 1,
      type: "STEP",
      content: JSON.stringify({ step: "provision", status: "started" }),
    });
    expect(ev).toEqual({
      seq: 1,
      event: "status",
      data: { step: "provision", status: "started" },
    });
  });

  it("maps STDOUT/STDERR to terminal with a stream discriminator", () => {
    expect(toStreamEvent({ seq: 2, type: "STDOUT", content: "hello" })).toEqual(
      { seq: 2, event: "terminal", data: { stream: "stdout", line: "hello" } },
    );
    expect(toStreamEvent({ seq: 3, type: "STDERR", content: "oops" })).toEqual({
      seq: 3,
      event: "terminal",
      data: { stream: "stderr", line: "oops" },
    });
  });

  it("maps CHECKPOINT to checkpoint, parsing JSON content", () => {
    const ev = toStreamEvent({
      seq: 4,
      type: "CHECKPOINT",
      content: JSON.stringify({ commitHash: "abc1234" }),
    });
    expect(ev).toEqual({
      seq: 4,
      event: "checkpoint",
      data: { commitHash: "abc1234" },
    });
  });

  it("maps EVENT to the wire event name and data encoded by encodeEventContent", () => {
    const content = encodeEventContent({
      event: "done",
      data: { status: "SUCCEEDED" },
    });
    expect(toStreamEvent({ seq: 5, type: "EVENT", content })).toEqual({
      seq: 5,
      event: "done",
      data: { status: "SUCCEEDED" },
    });
  });

  it("falls back to a safe error event for malformed EVENT content", () => {
    const ev = toStreamEvent({ seq: 6, type: "EVENT", content: "not json" });
    expect(ev.event).toBe("error");
    expect(ev.seq).toBe(6);
  });

  it("falls back to an error event when EVENT content names an unknown wire event", () => {
    const ev = toStreamEvent({
      seq: 7,
      type: "EVENT",
      content: JSON.stringify({ event: "not-a-real-event", data: {} }),
    });
    expect(ev.event).toBe("error");
  });

  it("passes through non-JSON STEP content as a raw string rather than throwing", () => {
    const ev = toStreamEvent({ seq: 8, type: "STEP", content: "not json" });
    expect(ev).toEqual({ seq: 8, event: "status", data: "not json" });
  });
});

describe("encodeSseFrame (BE-10)", () => {
  it("matches the id/event/data frame shape", () => {
    const frame = encodeSseFrame({
      seq: 5,
      event: "status",
      data: { step: "provision" },
    });
    expect(frame).toBe('id: 5\nevent: status\ndata: {"step":"provision"}\n\n');
  });

  it("prefixes every line of a multi-line data payload with data:", () => {
    const data = { stream: "stdout" as const, line: "a\nb" };
    const frame = encodeSseFrame({ seq: 1, event: "terminal", data });
    const expectedDataLines = JSON.stringify(data)
      .split("\n")
      .map((line) => `data: ${line}`)
      .join("\n");
    expect(frame).toBe(`id: 1\nevent: terminal\n${expectedDataLines}\n\n`);
  });

  it("ends every frame with a blank line (the SSE frame terminator)", () => {
    const frame = encodeSseFrame({ seq: 0, event: "done", data: null });
    expect(frame.endsWith("\n\n")).toBe(true);
  });
});

describe("encodeKeepalive (BE-10)", () => {
  it("is an SSE comment line", () => {
    expect(encodeKeepalive()).toBe(": keepalive\n\n");
  });
});

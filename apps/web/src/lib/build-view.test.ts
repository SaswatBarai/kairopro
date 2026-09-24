import { describe, expect, it } from "vitest";
import {
  applyBuildEvent,
  currentActivity,
  friendlyUnitLabel,
  initialBuildView,
  MAX_TERMINAL_LINES,
  simplifications,
  stepStates,
  type BuildEvent,
  type BuildViewState,
} from "./build-view";

let seq = 0;
const ev = (event: string, data: unknown): BuildEvent => ({
  seq: seq++,
  event,
  data,
});
const run = (events: BuildEvent[], from = initialBuildView()) =>
  events.reduce(applyBuildEvent, from);

const stage = (step: string, status: "started" | "completed") =>
  ev("status", { step, status });
const code = (data: unknown) => ev("code", data);

const stateOf = (s: BuildViewState) =>
  Object.fromEntries(stepStates(s).map((x) => [x.id, x.state]));

describe("applyBuildEvent — ordering", () => {
  it("ignores an event it has already applied (a replay after reconnect)", () => {
    seq = 0;
    const events = [
      ev("terminal", { stream: "stdout", line: "a" }),
      ev("terminal", { stream: "stdout", line: "b" }),
    ];
    const once = run(events);
    const twice = run(events, once);

    expect(twice).toBe(once);
    expect(twice.terminal.map((l) => l.text)).toEqual(["a", "b"]);
  });

  it("rebuilds identical state from a full replay", () => {
    seq = 0;
    const events = [
      stage("provision", "started"),
      code({ file: "a.ts", reset: true }),
      code({ file: "a.ts", content: "x" }),
      code({ file: "a.ts", done: true, omitted: false }),
      ev("done", { status: "SUCCEEDED" }),
    ];
    expect(run(events)).toEqual(run(events));
  });

  it("ignores unknown and malformed events without throwing", () => {
    seq = 0;
    const state = run([
      ev("status", { nonsense: true }),
      ev("terminal", null),
      ev("code", { file: 42 }),
      ev("something-new", {}),
    ]);
    expect(state.terminal).toEqual([]);
    expect(state.files).toEqual({});
  });
});

describe("terminal", () => {
  it("collects lines with their stream", () => {
    seq = 0;
    const s = run([
      ev("terminal", { stream: "stdout", line: "hello" }),
      ev("terminal", { stream: "stderr", line: "warn" }),
    ]);
    expect(s.terminal).toMatchObject([
      { stream: "stdout", text: "hello" },
      { stream: "stderr", text: "warn" },
    ]);
  });

  it("keeps the newest lines when over the cap, dropping the oldest", () => {
    seq = 0;
    const events = Array.from({ length: MAX_TERMINAL_LINES + 10 }, (_, i) =>
      ev("terminal", { stream: "stdout", line: `line ${i}` }),
    );
    const s = run(events);
    expect(s.terminal).toHaveLength(MAX_TERMINAL_LINES);
    expect(s.terminal[0]!.text).toBe("line 10");
    expect(s.terminal.at(-1)!.text).toBe(`line ${MAX_TERMINAL_LINES + 9}`);
  });
});

describe("code stream", () => {
  it("builds a file up from its chunks and marks it done", () => {
    seq = 0;
    const s = run([
      code({ file: "src/a.ts", reset: true }),
      code({ file: "src/a.ts", content: "export const " }),
      code({ file: "src/a.ts", content: "a = 1;" }),
      code({ file: "src/a.ts", done: true, omitted: false }),
    ]);
    expect(s.files["src/a.ts"]).toEqual({
      path: "src/a.ts",
      text: "export const a = 1;",
      status: "done",
      attempts: 1,
    });
    expect(s.activeFile).toBe("src/a.ts");
  });

  it("clears the file on a repair and counts the attempt", () => {
    seq = 0;
    const s = run([
      code({ file: "a.ts", reset: true }),
      code({ file: "a.ts", content: "broken" }),
      code({ file: "a.ts", reset: true }),
      code({ file: "a.ts", content: "fixed" }),
    ]);
    expect(s.files["a.ts"]).toMatchObject({
      text: "fixed",
      status: "writing",
      attempts: 2,
    });
  });

  it("tracks files in the order they started, and the latest as active", () => {
    seq = 0;
    const s = run([
      code({ file: "a.ts", reset: true }),
      code({ file: "a.ts", done: true, omitted: false }),
      code({ file: "b.ts", reset: true }),
    ]);
    expect(s.fileOrder).toEqual(["a.ts", "b.ts"]);
    expect(s.activeFile).toBe("b.ts");
  });

  it("replaces the whole file when told to, without counting a repair", () => {
    seq = 0;
    const s = run([
      code({ file: "a.ts", reset: true }),
      code({ file: "a.ts", content: "Here is the fix:\nexport const a = 1;" }),
      code({ file: "a.ts", content: "export const a = 1;", replace: true }),
      code({ file: "a.ts", done: true, omitted: false }),
    ]);
    expect(s.files["a.ts"]).toEqual({
      path: "a.ts",
      text: "export const a = 1;",
      status: "done",
      attempts: 1,
    });
  });

  it("marks an omitted unit", () => {
    seq = 0;
    const s = run([
      code({ file: "a.ts", reset: true }),
      code({ file: "a.ts", done: true, omitted: true }),
    ]);
    expect(s.files["a.ts"]!.status).toBe("omitted");
  });

  it("still builds a file when the reset frame was missed", () => {
    seq = 0;
    const s = run([code({ file: "a.ts", content: "tail" })]);
    expect(s.files["a.ts"]!.text).toBe("tail");
  });
});

describe("steps", () => {
  it("starts with every step pending", () => {
    expect(Object.values(stateOf(initialBuildView()))).toEqual(
      Array(7).fill("pending"),
    );
  });

  it("is running once a stage starts and done once all its stages complete", () => {
    seq = 0;
    const s = run([
      stage("provision", "started"),
      stage("provision", "completed"),
      stage("scaffold", "started"),
    ]);
    // environment = provision + scaffold: one done, one running
    expect(stateOf(s).environment).toBe("running");

    const t = run([stage("scaffold", "completed")], s);
    expect(stateOf(t).environment).toBe("done");
    expect(stateOf(t).database).toBe("pending");
  });

  it("marks every step done on success, even for stages an older build never reported", () => {
    seq = 0;
    const s = run([
      stage("provision", "completed"),
      ev("done", { status: "SUCCEEDED" }),
    ]);
    expect(Object.values(stateOf(s))).toEqual(Array(7).fill("done"));
  });

  it("leaves unfinished steps alone when the build is cancelled or fails", () => {
    seq = 0;
    const s = run([
      stage("schema", "started"),
      ev("done", { status: "CANCELLED" }),
    ]);
    expect(stateOf(s).database).toBe("running");
    expect(stateOf(s).api).toBe("pending");
  });
});

describe("outcome", () => {
  it("records success and cancellation from `done`", () => {
    seq = 0;
    expect(run([ev("done", { status: "SUCCEEDED" })]).outcome).toEqual({
      status: "SUCCEEDED",
    });
    seq = 0;
    expect(run([ev("done", { status: "CANCELLED" })]).outcome).toEqual({
      status: "CANCELLED",
    });
  });

  it("records failure with the server's user-safe message", () => {
    seq = 0;
    expect(run([ev("error", { message: "Try again." })]).outcome).toEqual({
      status: "FAILED",
      message: "Try again.",
    });
  });
});

describe("simplifications", () => {
  it("collects the last level per unit and labels it without exposing the path", () => {
    seq = 0;
    const s = run([
      code({
        unit: "src/app/api/tasks/route.ts",
        level: "simpler",
        message: "x",
      }),
      code({ unit: "src/app/api/tasks/route.ts", level: "omit", message: "x" }),
      code({ unit: "src/lib/auth.ts", level: "simpler", message: "x" }),
    ]);
    const list = simplifications(s);

    expect(list).toEqual([
      { label: "Tasks API", kind: "omitted" },
      { label: "Sign-in", kind: "simplified" },
    ]);
    expect(JSON.stringify(list)).not.toMatch(/src\/|\.ts/);
  });

  it("does not count a repair or a 'full' level as a simplification", () => {
    seq = 0;
    const s = run([
      code({ unit: "a.ts", repair: "fixed" }),
      code({ unit: "b.ts", level: "full", message: "x" }),
    ]);
    expect(simplifications(s)).toEqual([]);
  });
});

describe("friendlyUnitLabel", () => {
  it.each([
    ["src/app/api/tasks/route.ts", "Tasks API"],
    ["src/app/api/tasks/[taskId]/comments/route.ts", "Tasks / Comments API"],
    ["src/app/api/route.ts", "API"],
    ["src/app/page.tsx", "Home page"],
    ["src/app/(dashboard)/team-members/page.tsx", "Team members page"],
    ["src/app/projects/[id]/page.tsx", "Projects page"],
    ["src/lib/auth.ts", "Sign-in"],
    ["src/__tests__/unit/tasks.test.ts", "Automated tests"],
    ["src/lib/whatever.ts", "Part of your app"],
  ])("%s → %s", (unit, label) => {
    expect(friendlyUnitLabel(unit)).toBe(label);
  });
});

describe("currentActivity", () => {
  it("names the file being written, or refined on a repair", () => {
    seq = 0;
    const writing = run([code({ file: "a.ts", reset: true })]);
    expect(currentActivity(writing)).toBe("Writing a.ts");

    const refining = run([code({ file: "a.ts", reset: true })], writing);
    expect(currentActivity(refining)).toBe("Refining a.ts");
  });

  it("falls back to the running step, and is empty once finished", () => {
    seq = 0;
    const s = run([stage("schema", "started")]);
    expect(currentActivity(s)).toBe("Setting up the database");
    expect(
      currentActivity(run([ev("done", { status: "SUCCEEDED" })], s)),
    ).toBeNull();
  });
});

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseTscOutput, runTypecheck } from "./typecheck";

const execFileAsync = promisify(execFile);

/** The monorepo's own installed `tsc` — used to capture genuine compiler
 * output (Phase 16's own test list: "parses real tsc output including
 * multi-error output"), not a hand-written fixture string that could drift
 * from what `tsc` actually emits. */
const TSC_BIN = join(process.cwd(), "../../node_modules/.bin/tsc");

describe("parseTscOutput (AI-6, against real tsc output)", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "kairopro-typecheck-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function runRealTsc(source: string): Promise<string> {
    await writeFile(join(dir, "bad.ts"), source, "utf8");
    await writeFile(
      join(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
        },
        include: ["bad.ts"],
      }),
      "utf8",
    );

    try {
      const { stdout } = await execFileAsync(
        TSC_BIN,
        ["-p", "tsconfig.json", "--pretty", "false"],
        { cwd: dir },
      );
      return stdout;
    } catch (cause) {
      // tsc exits non-zero when it finds errors — the diagnostics are on stdout.
      return (cause as { stdout?: string }).stdout ?? "";
    }
  }

  it("parses multiple single-line diagnostics with file, line, column, code, and message", async () => {
    const output = await runRealTsc(
      [
        "const x: number = 'not a number';",
        "function add(a: number, b: number): number { return a + b; }",
        "const y = add('1', '2');",
      ].join("\n"),
    );

    const errors = parseTscOutput(output);

    expect(errors).toHaveLength(2);
    for (const error of errors) {
      expect(error.file).toContain("bad.ts");
      expect(error.line).toBeGreaterThan(0);
      expect(error.column).toBeGreaterThan(0);
      expect(error.code).toMatch(/^TS\d+$/);
      expect(error.message.length).toBeGreaterThan(0);
    }
    expect(errors[0]!.code).toBe("TS2322");
    expect(errors[1]!.code).toBe("TS2345");
  });

  it("folds a diagnostic's wrapped continuation lines into one error, not several", async () => {
    const output = await runRealTsc(
      [
        "interface A { value: { nested: number } }",
        "interface B { value: { nested: string } }",
        "function take(b: B): void {}",
        "const a: A = { value: { nested: 1 } };",
        "take(a);",
      ].join("\n"),
    );

    const errors = parseTscOutput(output);

    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("TS2345");
    // The wrapped explanation lines are part of this one error's message.
    expect(errors[0]!.message).toContain("not assignable to parameter");
    expect(errors[0]!.message).toContain("incompatible");
  });

  it("returns an empty array for a project that type-checks cleanly", async () => {
    const output = await runRealTsc("const x: number = 1;\n");
    expect(parseTscOutput(output)).toEqual([]);
  });
});

describe("parseTscOutput (fixture-based)", () => {
  it("returns an empty array for empty output", () => {
    expect(parseTscOutput("")).toEqual([]);
  });

  it("ignores a summary/banner line that never started a diagnostic", () => {
    const output = "Found 0 errors. Watching for file changes.\n";
    expect(parseTscOutput(output)).toEqual([]);
  });
});

describe("runTypecheck (AI-6)", () => {
  it("execs tsc inside the given container and cwd, returning parsed errors", async () => {
    const exec = vi.fn().mockResolvedValue({
      exitCode: 2,
      stdout:
        "src/app/page.tsx(3,7): error TS2322: Type 'string' is not assignable to type 'number'.\n",
      stderr: "",
    });
    const runtime = { exec } as never;

    const errors = await runTypecheck({
      runtime,
      containerId: "c1",
      cwd: "/workspace",
    });

    expect(exec).toHaveBeenCalledWith(
      expect.objectContaining({
        containerId: "c1",
        cwd: "/workspace",
        cmd: expect.stringContaining("tsc --noEmit"),
      }),
    );
    expect(errors).toEqual([
      {
        file: "src/app/page.tsx",
        line: 3,
        column: 7,
        code: "TS2322",
        message: "Type 'string' is not assignable to type 'number'.",
      },
    ]);
  });

  it("returns an empty array when tsc exits clean", async () => {
    const exec = vi
      .fn()
      .mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });
    const runtime = { exec } as never;

    const errors = await runTypecheck({ runtime, containerId: "c1" });
    expect(errors).toEqual([]);
  });
});

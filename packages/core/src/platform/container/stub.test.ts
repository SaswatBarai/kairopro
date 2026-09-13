import { describe, expect, it } from "vitest";
import { createStubContainerRuntime } from "./stub";
import { getContainerRuntime } from "./index";
import type { ExecInput } from "./runtime";

const execInput = (overrides: Partial<ExecInput> = {}): ExecInput => ({
  containerId: "stub-prj_taskflow",
  cmd: "echo hello",
  ...overrides,
});

describe("StubContainerRuntime", () => {
  it("execs a command on the host and returns exit code, stdout, stderr", async () => {
    const runtime = createStubContainerRuntime();
    const result = await runtime.exec(
      execInput({ cmd: "echo hello && echo oops 1>&2" }),
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("hello\n");
    expect(result.stderr).toBe("oops\n");
  });

  it("reports a nonzero exit code without throwing", async () => {
    const runtime = createStubContainerRuntime();
    const result = await runtime.exec(execInput({ cmd: "exit 3" }));
    expect(result.exitCode).toBe(3);
  });

  it("honors cwd and env for the executed command", async () => {
    const runtime = createStubContainerRuntime();
    const result = await runtime.exec(
      execInput({
        cmd: "pwd && echo $KAIROPRO_STUB_VAR",
        env: { KAIROPRO_STUB_VAR: "injected" },
      }),
    );
    expect(result.stdout).toContain("injected");
    expect(result.exitCode).toBe(0);
  });

  it("throws a typed TimeoutError when the command exceeds its timeout", async () => {
    const runtime = createStubContainerRuntime();
    await expect(
      runtime.exec(execInput({ cmd: "sleep 5", timeoutMs: 50 })),
    ).rejects.toMatchObject({ code: "TIMEOUT_ERROR", status: 504 });
  });

  it("streams stdout line by line, including a final partial line", async () => {
    const runtime = createStubContainerRuntime();
    const lines: string[] = [];
    const result = await runtime.execStream(
      execInput({ cmd: "printf 'one\\ntwo\\nthree-no-newline'" }),
      (line) => lines.push(line),
    );
    expect(lines).toEqual(["one", "two", "three-no-newline"]);
    expect(result.stdout).toBe("one\ntwo\nthree-no-newline");
  });

  it("provisions with a stable id, reports healthy, and no-ops stop/destroy", async () => {
    const runtime = createStubContainerRuntime();
    await expect(
      runtime.provision({ projectId: "prj_taskflow", image: "kairopro/app" }),
    ).resolves.toEqual({ containerId: "stub-prj_taskflow", previewUrl: "" });
    await expect(runtime.health("stub-prj_taskflow")).resolves.toEqual({
      ready: true,
    });
    await expect(runtime.stop("stub-prj_taskflow")).resolves.toBeUndefined();
    await expect(runtime.destroy("stub-prj_taskflow")).resolves.toBeUndefined();
  });
});

describe("StubContainerRuntime — production guard", () => {
  const previous = process.env.NODE_ENV;

  it("refuses to be constructed in production", () => {
    process.env.NODE_ENV = "production";
    try {
      expect(() => createStubContainerRuntime()).toThrow(/production/);
      expect(() => getContainerRuntime()).toThrow(/production/);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("a runtime built in development re-checks on every call if the environment flips", async () => {
    const runtime = createStubContainerRuntime();
    process.env.NODE_ENV = "production";
    try {
      await expect(runtime.exec(execInput())).rejects.toThrow(
        /never run in production/,
      );
      await expect(
        runtime.provision({ projectId: "prj", image: "img" }),
      ).rejects.toThrow(/never run in production/);
      await expect(runtime.health("c")).rejects.toThrow(
        /never run in production/,
      );
      await expect(runtime.stop("c")).rejects.toThrow(
        /never run in production/,
      );
      await expect(runtime.destroy("c")).rejects.toThrow(
        /never run in production/,
      );
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

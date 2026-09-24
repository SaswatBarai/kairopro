import { describe, expect, it } from "vitest";
import { createStubContainerRuntime, hostEnvForCommands } from "./stub";
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

  it("refuses to be constructed directly in production", () => {
    process.env.NODE_ENV = "production";
    try {
      expect(() => createStubContainerRuntime()).toThrow(/production/);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("the selector never hands back the stub in production (BE-9: real DockerRuntime instead)", () => {
    process.env.NODE_ENV = "production";
    const previousRoot = process.env.KAIROPRO_WORKSPACE_ROOT;
    process.env.KAIROPRO_WORKSPACE_ROOT = "/tmp/kairopro-workspaces-test";
    try {
      expect(() => getContainerRuntime()).not.toThrow();
    } finally {
      process.env.NODE_ENV = previous;
      if (previousRoot === undefined)
        delete process.env.KAIROPRO_WORKSPACE_ROOT;
      else process.env.KAIROPRO_WORKSPACE_ROOT = previousRoot;
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

describe("stub command environment", () => {
  it("never exposes the platform's secrets to a command", async () => {
    process.env.DATABASE_URL = "postgresql://platform-secret";
    process.env.ANTHROPIC_API_KEY = "sk-secret";
    try {
      const runtime = createStubContainerRuntime();
      const result = await runtime.exec(
        execInput({
          cmd: 'echo "db=${DATABASE_URL:-unset} key=${ANTHROPIC_API_KEY:-unset}"',
        }),
      );
      expect(result.stdout.trim()).toBe("db=unset key=unset");
    } finally {
      delete process.env.DATABASE_URL;
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it("still passes what a command needs to run, and explicit env wins", async () => {
    const runtime = createStubContainerRuntime();
    const result = await runtime.exec(
      execInput({
        cmd: 'test -n "$PATH" && echo "db=$DATABASE_URL"',
        env: { DATABASE_URL: "postgresql://the-project-db" },
      }),
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("db=postgresql://the-project-db");
  });

  it("allowlists by name, so a new secret is excluded by default", () => {
    const env = hostEnvForCommands({
      PATH: "/bin",
      HOME: "/home/u",
      LC_ALL: "C",
      https_proxy: "http://proxy",
      npm_config_registry: "https://registry",
      DATABASE_URL: "x",
      KAIROPRO_ENCRYPTION_KEY: "x",
      NEXTAUTH_SECRET: "x",
      SOME_FUTURE_TOKEN: "x",
      npm_config_user_agent: "pnpm",
    });
    expect(Object.keys(env).sort()).toEqual(
      ["HOME", "LC_ALL", "PATH", "https_proxy", "npm_config_registry"].sort(),
    );
  });
});

describe("stub provisioned environment", () => {
  it("applies the env given at provision to every command in that container", async () => {
    const runtime = createStubContainerRuntime();
    const { containerId } = await runtime.provision({
      projectId: "prj_env",
      image: "img",
      env: { DATABASE_URL: "postgresql://project-db" },
    });

    const inside = await runtime.exec({
      containerId,
      cmd: 'echo "$DATABASE_URL"',
    });
    const other = await runtime.exec({
      containerId: "stub-someone-else",
      cmd: 'echo "${DATABASE_URL:-unset}"',
    });

    expect(inside.stdout.trim()).toBe("postgresql://project-db");
    expect(other.stdout.trim()).toBe("unset");
  });

  it("forgets a container's env once it is destroyed", async () => {
    const runtime = createStubContainerRuntime();
    const { containerId } = await runtime.provision({
      projectId: "prj_gone",
      image: "img",
      env: { X_TEST: "1" },
    });
    await runtime.destroy(containerId);

    const result = await runtime.exec({
      containerId,
      cmd: 'echo "${X_TEST:-unset}"',
    });
    expect(result.stdout.trim()).toBe("unset");
  });
});

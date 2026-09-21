import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../../lib/context";
import type { LLMCompleteResult, LLMProvider } from "../../llm/provider";

vi.mock("../../../usage/usage.service", () => ({ emit: vi.fn() }));
vi.mock("../../validators/typecheck", () => ({ runTypecheck: vi.fn() }));

import { runTypecheck } from "../../validators/typecheck";
import { freezeContracts } from "./freeze-contracts";

const execFileAsync = promisify(execFile);
const TSC_BIN = join(process.cwd(), "../../node_modules/.bin/tsc");
const ctx: RequestContext = { userId: "u1", orgId: "o1" };

const CONTRACTS_MODULE = `
import { z } from "zod";

export interface CreateTaskRequest {
  title: string;
}
export const CreateTaskRequestSchema = z.object({ title: z.string() });

export interface CreateTaskResponse {
  id: string;
  title: string;
}
export const CreateTaskResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
});
`.trim();

function providerReturning(content: string): LLMProvider {
  const result: LLMCompleteResult = {
    content,
    usage: { inputTokens: 1, outputTokens: 1 },
    stopReason: "end_turn",
  };
  return {
    name: "fake",
    complete: vi.fn().mockResolvedValue(result),
    stream: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("freezeContracts (AI-6)", () => {
  it("writes types and Zod schemas to the template's contracts path", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([]);
    const writeFileMock = vi.fn().mockResolvedValue(undefined);
    const workspace = { writeFile: writeFileMock } as never;
    const provider = providerReturning(CONTRACTS_MODULE);

    const result = await freezeContracts({
      projectId: "p1",
      ctx,
      workspace,
      runtime: {} as never,
      containerId: "c1",
      conventions: "Import alias: @/",
      specs: "specs text",
      contractsPath: "src/lib/contracts.ts",
      provider,
    });

    expect(result.path).toBe("src/lib/contracts.ts");
    expect(writeFileMock).toHaveBeenCalledWith(
      "p1",
      "src/lib/contracts.ts",
      CONTRACTS_MODULE,
    );

    // The task given to the model actually asks for types AND Zod schemas,
    // named from the app structure spec — not left to the model to invent.
    const promptText = (
      provider.complete as ReturnType<typeof vi.fn>
    ).mock.calls[0]![0].messages.map(
      (m: { content: string }) => m.content,
    ).join("\n");
    expect(promptText).toMatch(/Zod schema/i);
    expect(promptText).toMatch(/App Structure spec/i);
  });
});

describe("freezeContracts output (AI-6, real tsc importability proof)", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "kairopro-freeze-contracts-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("the frozen module's exports are importable, as-is, from a fixture API route and a fixture component", async () => {
    await writeFile(join(dir, "contracts.ts"), CONTRACTS_MODULE, "utf8");
    // Fixture "API route" and "component" consumers — plain .ts, no JSX,
    // so this stays a pure importability proof with no React types needed.
    await writeFile(
      join(dir, "route.ts"),
      [
        'import { CreateTaskRequestSchema, type CreateTaskResponse } from "./contracts";',
        "",
        "export function handleCreateTask(body: unknown): CreateTaskResponse {",
        "  const parsed = CreateTaskRequestSchema.parse(body);",
        '  return { id: "1", title: parsed.title };',
        "}",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      join(dir, "component.ts"),
      [
        'import { CreateTaskResponseSchema, type CreateTaskResponse } from "./contracts";',
        "",
        "export function renderTaskCard(task: CreateTaskResponse): string {",
        "  CreateTaskResponseSchema.parse(task);",
        "  return task.title;",
        "}",
      ].join("\n"),
      "utf8",
    );

    // Point directly at the monorepo's already-resolved `zod` package
    // instead of installing/symlinking one into the fixture directory.
    const require = (await import("node:module")).createRequire(
      import.meta.url,
    );
    const zodPkgJson = require.resolve("zod/package.json");
    const zodDir = join(zodPkgJson, "..");

    await writeFile(
      join(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          types: [],
          paths: { zod: [zodDir] },
        },
        include: ["*.ts"],
      }),
      "utf8",
    );

    let stdout = "";
    let stderr = "";
    let exitCode = 0;
    try {
      const res = await execFileAsync(
        TSC_BIN,
        ["-p", "tsconfig.json", "--pretty", "false"],
        { cwd: dir },
      );
      stdout = res.stdout;
      stderr = res.stderr;
    } catch (cause) {
      const err = cause as { stdout?: string; stderr?: string; code?: number };
      stdout = err.stdout ?? "";
      stderr = err.stderr ?? "";
      exitCode = err.code ?? 1;
    }

    expect(stdout + stderr).toBe("");
    expect(exitCode).toBe(0);
  }, 30_000);
});

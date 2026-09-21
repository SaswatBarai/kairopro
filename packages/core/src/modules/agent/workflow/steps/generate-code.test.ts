import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../../lib/context";
import type {
  LLMCompleteResult,
  LLMMessage,
  LLMProvider,
} from "../../llm/provider";

vi.mock("../../../usage/usage.service", () => ({ emit: vi.fn() }));
vi.mock("../../validators/typecheck", () => ({ runTypecheck: vi.fn() }));
vi.mock("../../context/retrieve", () => ({ retrieve: vi.fn() }));

import { retrieve } from "../../context/retrieve";
import { runTypecheck } from "../../validators/typecheck";
import { CodeGenerationError, generateFile } from "./generate-code";

const ctx: RequestContext = { userId: "u1", orgId: "o1" };

function result(content: string): LLMCompleteResult {
  return {
    content,
    usage: { inputTokens: 1, outputTokens: 1 },
    stopReason: "end_turn",
  };
}

function providerReturning(...contents: string[]): LLMProvider {
  const complete = vi.fn();
  for (const c of contents) complete.mockResolvedValueOnce(result(c));
  return { name: "fake", complete, stream: vi.fn() };
}

function fakeWorkspace() {
  return { writeFile: vi.fn().mockResolvedValue(undefined) };
}
const runtime = {} as never;

const baseInput = {
  path: "src/lib/x.ts",
  task: "Write x.",
  conventions: "conventions text",
  specs: "specs text",
  projectId: "p1",
  ctx,
  runtime,
  containerId: "c1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateFile (AI-6)", () => {
  it("writes the generated content and reports zero fix attempts when it type-checks clean on the first try", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([]);
    const workspace = fakeWorkspace();
    const provider = providerReturning("export const x = 1;");

    const outcome = await generateFile({
      ...baseInput,
      workspace: workspace as never,
      provider,
    });

    expect(outcome).toEqual({ path: "src/lib/x.ts", fixAttempts: 0 });
    expect(workspace.writeFile).toHaveBeenCalledWith(
      "p1",
      "src/lib/x.ts",
      "export const x = 1;",
    );
  });

  it("strips a markdown code fence from the generated content before writing", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([]);
    const workspace = fakeWorkspace();
    const provider = providerReturning("```ts\nexport const x = 1;\n```");

    await generateFile({
      ...baseInput,
      workspace: workspace as never,
      provider,
    });

    expect(workspace.writeFile).toHaveBeenCalledWith(
      "p1",
      "src/lib/x.ts",
      "export const x = 1;",
    );
  });

  it("a type-check failure triggers exactly one fix before the file is considered done — the per-file loop", async () => {
    vi.mocked(runTypecheck)
      .mockResolvedValueOnce([
        {
          file: "src/lib/x.ts",
          line: 1,
          column: 7,
          code: "TS2322",
          message: "bad",
        },
      ])
      .mockResolvedValueOnce([]);
    vi.mocked(retrieve).mockResolvedValue({
      summary: "summary",
      files: [],
      partial: false,
      omitted: [],
    });
    const workspace = fakeWorkspace();
    const provider = providerReturning(
      "export const x: number = 'bad';",
      "export const x = 1;",
    );

    const outcome = await generateFile({
      ...baseInput,
      workspace: workspace as never,
      provider,
    });

    expect(outcome.fixAttempts).toBe(1);
    expect(workspace.writeFile).toHaveBeenCalledTimes(2);
    expect(workspace.writeFile).toHaveBeenLastCalledWith(
      "p1",
      "src/lib/x.ts",
      "export const x = 1;",
    );
    // The fix prompt actually carried tsc's own diagnostic forward.
    const fixCallMessages = (
      provider.complete as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[1]![0].messages as LLMMessage[];
    const fixPromptText = fixCallMessages.map((m) => m.content).join("\n");
    expect(fixPromptText).toContain("TS2322");
  });

  it("throws CodeGenerationError after exhausting fix attempts, and requests no more completions than allotted", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([
      {
        file: "src/lib/x.ts",
        line: 1,
        column: 1,
        code: "TS2322",
        message: "still bad",
      },
    ]);
    vi.mocked(retrieve).mockResolvedValue({
      summary: "s",
      files: [],
      partial: false,
      omitted: [],
    });
    const workspace = fakeWorkspace();
    const provider = providerReturning("v1", "v2", "v3");

    await expect(
      generateFile({
        ...baseInput,
        workspace: workspace as never,
        provider,
        maxFixAttempts: 2,
      }),
    ).rejects.toBeInstanceOf(CodeGenerationError);

    // 1 initial generation + 2 fix attempts = 3 completions, no more.
    expect(provider.complete).toHaveBeenCalledTimes(3);
  });

  it("the thrown error carries the file path and tsc's structured errors", async () => {
    const tscErrors = [
      {
        file: "src/lib/x.ts",
        line: 1,
        column: 1,
        code: "TS2322",
        message: "still bad",
      },
    ];
    vi.mocked(runTypecheck).mockResolvedValue(tscErrors);
    vi.mocked(retrieve).mockResolvedValue({
      summary: "s",
      files: [],
      partial: false,
      omitted: [],
    });
    const workspace = fakeWorkspace();
    const provider = providerReturning("v1", "v2");

    try {
      await generateFile({
        ...baseInput,
        workspace: workspace as never,
        provider,
        maxFixAttempts: 1,
      });
      expect.fail("expected generateFile to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CodeGenerationError);
      const generationError = error as CodeGenerationError;
      expect(generationError.path).toBe("src/lib/x.ts");
      expect(generationError.typecheckErrors).toEqual(tscErrors);
    }
  });

  it("conventions reach the prompt from rendered template data, not from hardcoded prompt text", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([]);
    const workspace = fakeWorkspace();
    const complete = vi
      .fn()
      .mockImplementation(async (input: { messages: LLMMessage[] }) => {
        const text = input.messages.map((m) => m.content).join("\n");
        const alias = /Import alias: (\S+)/.exec(text)?.[1] ?? "NONE";
        return result(`import x from "${alias}lib/x";`);
      });
    const provider: LLMProvider = { name: "fake", complete, stream: vi.fn() };

    await generateFile({
      ...baseInput,
      conventions: "Import alias: ~/\nOther: y",
      workspace: workspace as never,
      provider,
    });

    expect(workspace.writeFile).toHaveBeenCalledWith(
      "p1",
      "src/lib/x.ts",
      'import x from "~/lib/x";',
    );
  });
});

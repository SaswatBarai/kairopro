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
// fix-loop.ts (real, unmocked — this is an integration of Phase 16 + 17)
// logs through here on every non-success outcome; mocked purely to avoid
// a real database connection in a unit test, not to change behavior.
vi.mock("../../../build/build.repository", () => ({
  createInternalErrorRow: vi.fn().mockResolvedValue({ id: "err-1" }),
}));

import { retrieve } from "../../context/retrieve";
import { runTypecheck } from "../../validators/typecheck";
import {
  CodeGenerationError,
  generateFile,
  type CodeStreamEvent,
} from "./generate-code";

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

/** Every call after the scripted ones repeats the last content — used for
 * tests that don't care exactly how many completions the fix loop makes. */
function providerReturningRepeating(content: string): LLMProvider {
  return {
    name: "fake",
    complete: vi.fn().mockResolvedValue(result(content)),
    stream: vi.fn(),
  };
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
  concern: "other" as const,
  projectId: "p1",
  ctx,
  runtime,
  containerId: "c1",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(retrieve).mockResolvedValue({
    summary: "summary",
    files: [],
    partial: false,
    omitted: [],
  });
});

describe("generateFile (AI-6, repair via AI-7 fix-loop)", () => {
  it("writes the generated content and reports zero fix attempts when it type-checks clean on the first try", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([]);
    const workspace = fakeWorkspace();
    const provider = providerReturning("export const x = 1;");

    const outcome = await generateFile({
      ...baseInput,
      workspace: workspace as never,
      provider,
    });

    expect(outcome).toEqual({
      path: "src/lib/x.ts",
      fixAttempts: 1,
      level: "full",
      omitted: false,
    });
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

    expect(outcome).toEqual({
      path: "src/lib/x.ts",
      fixAttempts: 2,
      level: "full",
      omitted: false,
    });
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

  it("a never-degradable concern that never recovers throws CodeGenerationError, never silently simplified", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([
      {
        file: "src/lib/x.ts",
        line: 1,
        column: 1,
        code: "TS2322",
        message: "still bad",
      },
    ]);
    const workspace = fakeWorkspace();
    const provider = providerReturningRepeating("v");

    await expect(
      generateFile({
        ...baseInput,
        concern: "authorization",
        workspace: workspace as never,
        provider,
        maxDistinctApproaches: 2,
        maxFixAttempts: 10,
      }),
    ).rejects.toBeInstanceOf(CodeGenerationError);
  });

  it("the thrown error carries the file path and the halt reason", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([
      {
        file: "src/lib/x.ts",
        line: 1,
        column: 1,
        code: "TS2322",
        message: "still bad",
      },
    ]);
    const workspace = fakeWorkspace();
    const provider = providerReturningRepeating("v");

    try {
      await generateFile({
        ...baseInput,
        concern: "authorization",
        workspace: workspace as never,
        provider,
        maxDistinctApproaches: 1,
        maxFixAttempts: 5,
      });
      expect.fail("expected generateFile to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CodeGenerationError);
      const generationError = error as CodeGenerationError;
      expect(generationError.path).toBe("src/lib/x.ts");
      expect(generationError.reason).toBe("never-degradable");
    }
  });

  it("an exec-level failure while type-checking propagates directly, not through the fix loop", async () => {
    // runTypecheck rejecting is a genuine thrown error (a bug in the
    // tooling, not a classifiable failure signal) — the fix loop's
    // `attempt` closure doesn't catch it, so it propagates as-is.
    vi.mocked(runTypecheck).mockRejectedValue(new Error("boom"));

    await expect(
      generateFile({
        ...baseInput,
        workspace: fakeWorkspace() as never,
        provider: providerReturningRepeating("v"),
      }),
    ).rejects.toThrow("boom");
  });

  it("a degradable concern that never recovers is eventually omitted, not thrown", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([
      {
        file: "src/lib/x.ts",
        line: 1,
        column: 1,
        code: "TS2322",
        message: "still bad",
      },
    ]);
    const workspace = fakeWorkspace();
    const provider = providerReturningRepeating("v");

    const outcome = await generateFile({
      ...baseInput,
      concern: "layout",
      workspace: workspace as never,
      provider,
      maxDistinctApproaches: 1,
      maxFixAttempts: 10,
    });

    expect(outcome.omitted).toBe(true);
    expect(outcome.level).toBe("omit");
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

/** A provider whose `stream` delivers each scripted answer in three chunks,
 * the way the real one does. `complete` must never be used when streaming. */
function streamingProvider(...contents: string[]): LLMProvider {
  const queue = [...contents];
  return {
    name: "fake",
    complete: vi.fn(),
    stream: vi.fn(async (_input, onEvent) => {
      const content = queue.shift() ?? contents.at(-1)!;
      const third = Math.ceil(content.length / 3);
      for (let i = 0; i < content.length; i += third) {
        onEvent({ delta: content.slice(i, i + third) });
      }
      return result(content);
    }),
  };
}

const typeError = {
  file: "src/lib/x.ts",
  line: 1,
  column: 1,
  code: "TS2322",
  message: "bad",
};

describe("generateFile live code stream", () => {
  it("emits reset, the text as it arrives, then done — without calling complete()", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([]);
    const events: CodeStreamEvent[] = [];
    const provider = streamingProvider("export const x = 1;");

    await generateFile({
      ...baseInput,
      workspace: fakeWorkspace() as never,
      provider,
      onCode: (e) => events.push(e),
    });

    expect(events[0]).toEqual({ type: "reset" });
    expect(events.at(-1)).toEqual({ type: "done", omitted: false });
    const text = events
      .filter((e) => e.type === "delta")
      .map((e) => (e as { text: string }).text)
      .join("");
    expect(text).toBe("export const x = 1;");
    expect(events.filter((e) => e.type === "delta").length).toBeGreaterThan(1);
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("resets and rewrites the file when a repair is needed", async () => {
    vi.mocked(runTypecheck)
      .mockResolvedValueOnce([typeError])
      .mockResolvedValue([]);
    const events: CodeStreamEvent[] = [];
    const provider = streamingProvider("const x: string = 1;", "const x = 1;");

    await generateFile({
      ...baseInput,
      workspace: fakeWorkspace() as never,
      provider,
      onCode: (e) => events.push(e),
    });

    const types = events.map((e) => e.type);
    expect(types.filter((t) => t === "reset")).toHaveLength(2);
    expect(types.filter((t) => t === "done")).toHaveLength(1);
    expect(types.at(-1)).toBe("done");
    // The second attempt's text follows the second reset.
    const afterLastReset = events.slice(
      types.lastIndexOf("reset") + 1,
    ) as Array<{ type: string; text?: string }>;
    expect(
      afterLastReset
        .filter((e) => e.type === "delta")
        .map((e) => e.text)
        .join(""),
    ).toBe("const x = 1;");
  });

  it("reports an omitted unit as done with omitted: true", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([typeError]);
    const events: CodeStreamEvent[] = [];

    const outcome = await generateFile({
      ...baseInput,
      concern: "layout",
      workspace: fakeWorkspace() as never,
      provider: streamingProvider("v"),
      maxDistinctApproaches: 1,
      maxFixAttempts: 10,
      onCode: (e) => events.push(e),
    });

    expect(outcome.omitted).toBe(true);
    expect(events.at(-1)).toEqual({ type: "done", omitted: true });
  });

  it("does not stream at all when no onCode is given", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([]);
    const provider = providerReturning("export const x = 1;");

    await generateFile({
      ...baseInput,
      workspace: fakeWorkspace() as never,
      provider,
    });

    expect(provider.stream).not.toHaveBeenCalled();
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });
});

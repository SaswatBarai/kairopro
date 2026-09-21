import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../lib/context";
import type { AppStructureContent } from "../validators/app-structure";
import type { PrdContent } from "../validators/prd";
import type { TemplateManifest } from "../template";
import type { ApprovedSpecs } from "../workflow/steps/generation-context";
import type {
  LLMCompleteResult,
  LLMMessage,
  LLMProvider,
} from "../llm/provider";

vi.mock("../../build/build.repository", () => ({
  createInternalErrorRow: vi.fn().mockResolvedValue({ id: "err-1" }),
}));
vi.mock("../../spec/spec.repository", () => ({
  findApprovedSpecsByTypes: vi.fn(),
}));
vi.mock("../../usage/usage.service", () => ({ emit: vi.fn() }));
vi.mock("../validators/typecheck", () => ({ runTypecheck: vi.fn() }));

import { runTypecheck } from "../validators/typecheck";
import {
  deriveTestCases,
  generateTestFile,
  readImplementationHeader,
  runTestAuthoringPhase,
} from "./test-authoring";

const ctx: RequestContext = { userId: "u1", orgId: "o1" };

const template: TemplateManifest = {
  id: "nextjs-shadcn",
  stack: "Next.js + shadcn/ui",
  description: "",
  conventions: {
    importAlias: "@/",
    srcDir: "src",
    apiRoutesDir: "src/app/api",
    pagesDir: "src/app",
    componentsDir: "src/components",
    libDir: "src/lib",
    contractsPath: "src/lib/contracts.ts",
    authConfigPath: "src/lib/auth.ts",
    prismaSchemaPath: "prisma/schema.prisma",
    styling: "tailwindcss",
    validation: "zod",
    orm: "prisma",
    auth: "next-auth",
    testFramework: "vitest",
  },
};

const prd: PrdContent = {
  overview: "o",
  goals: ["g"],
  nonGoals: [],
  personas: [{ name: "User", description: "d" }],
  userStories: [{ persona: "User", story: "s" }],
  assumptions: [],
  businessRules: {
    invariants: ["a task's total is never negative"],
    stateMachine: [
      {
        entity: "Task",
        states: ["open", "done"],
        transitions: [{ from: "open", to: "done", trigger: "complete" }],
      },
    ],
    permissionMatrix: [
      { role: "Manager", entity: "Task", actions: ["approve", "delete"] },
    ],
    validationRules: ["title must not be empty"],
    moneyRules: ["N/A — no monetary values"],
    sideEffects: ["s"],
  },
};

const appStructure: AppStructureContent = {
  pages: [{ route: "/tasks", personas: ["User"] }],
  endpoints: [
    {
      method: "DELETE",
      path: "/api/tasks/:id",
      requestType: "DeleteTaskRequest",
      responseType: "DeleteTaskResponse",
    },
    {
      method: "GET",
      path: "/api/tasks",
      requestType: "ListTasksRequest",
      responseType: "ListTasksResponse",
    },
  ],
  components: [{ name: "TaskList", responsibility: "r" }],
};

const specs: ApprovedSpecs = {
  prd,
  design: "# Design",
  dataModel: "model Task { id String @id }",
  appStructure,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deriveTestCases (AI-8) — business rules → tests", () => {
  it("a fixture invariant produces a corresponding unit-level assertion", () => {
    const cases = deriveTestCases(specs, template);
    const invariantCase = cases.find((c) => c.source === "invariant")!;

    expect(invariantCase).toBeDefined();
    expect(invariantCase.level).toBe("unit");
    expect(invariantCase.concern).toBe("data-invariants");
    expect(invariantCase.task).toContain("a task's total is never negative");
  });

  it("the state machine produces a unit test covering its transitions", () => {
    const cases = deriveTestCases(specs, template);
    const smCase = cases.find((c) => c.source === "state-machine")!;

    expect(smCase.level).toBe("unit");
    expect(smCase.task).toContain("open");
    expect(smCase.task).toContain("done");
    expect(smCase.task).toContain("complete");
  });

  it("a fixture permission matrix produces one negative test per role-action pair", () => {
    const cases = deriveTestCases(specs, template);
    const permissionCases = cases.filter((c) => c.source === "permission");

    // 1 role × 2 actions (approve, delete) = 2 negative tests.
    expect(permissionCases).toHaveLength(2);
    expect(permissionCases.every((c) => c.level === "integration")).toBe(true);
    expect(permissionCases.every((c) => c.concern === "authorization")).toBe(
      true,
    );

    const approveCase = permissionCases.find((c) =>
      c.task.includes("approve"),
    )!;
    expect(approveCase.task).toContain('NOT "Manager"');
    expect(approveCase.task).toMatch(/forbidden/i);

    const deleteCase = permissionCases.find((c) => c.task.includes("delete"))!;
    expect(deleteCase.implementationPath).toBe(
      "src/app/api/tasks/[id]/route.ts",
    );
  });

  it("validation rules and non-N/A money rules each produce a unit test; a literal N/A money rule does not", () => {
    const cases = deriveTestCases(specs, template);
    expect(cases.some((c) => c.source === "validation")).toBe(true);
    expect(cases.some((c) => c.source === "money")).toBe(false);
  });

  it("every page produces an e2e primary-flow test pointing at its page file", () => {
    const cases = deriveTestCases(specs, template);
    const flow = cases.find((c) => c.source === "primary-flow")!;
    expect(flow.level).toBe("e2e");
    expect(flow.implementationPath).toBe("src/app/tasks/page.tsx");
    expect(flow.path).toMatch(/^e2e\/.*\.spec\.ts$/);
  });
});

describe("readImplementationHeader (AI-8)", () => {
  it("extracts the @implementation header from generated test content", () => {
    const content =
      "// @implementation: src/app/api/tasks/route.ts\n\nit('x', () => {});";
    expect(readImplementationHeader(content)).toBe(
      "src/app/api/tasks/route.ts",
    );
  });

  it("returns null when no header is present", () => {
    expect(readImplementationHeader("it('x', () => {});")).toBeNull();
  });
});

function result(content: string): LLMCompleteResult {
  return {
    content,
    usage: { inputTokens: 1, outputTokens: 1 },
    stopReason: "end_turn",
  };
}

describe("generateTestFile / runTestAuthoringPhase (AI-8) — never the implementation", () => {
  it("the assembled prompt context never includes content read from the workspace — readFile is never called", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([]);
    const IMPLEMENTATION_SENTINEL = "SECRET_IMPLEMENTATION_DETAIL_12345";
    const readFile = vi.fn().mockResolvedValue(IMPLEMENTATION_SENTINEL);
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const workspace = { readFile, writeFile } as never;

    const complete = vi.fn().mockResolvedValue(result("it('x', () => {});"));
    const provider: LLMProvider = { name: "fake", complete, stream: vi.fn() };

    await generateTestFile({
      path: "src/__tests__/unit/x.test.ts",
      task: "Write a test.",
      conventions: "conv",
      specs: "specs text",
      contracts: "export interface X {}",
      concern: "other",
      projectId: "p1",
      ctx,
      workspace,
      runtime: {} as never,
      containerId: "c1",
      provider,
    });

    expect(readFile).not.toHaveBeenCalled();

    const promptText = (
      complete.mock.calls[0]![0] as { messages: LLMMessage[] }
    ).messages
      .map((m) => m.content)
      .join("\n");
    expect(promptText).not.toContain(IMPLEMENTATION_SENTINEL);
  });

  it("a compile-repair attempt also never reads the workspace or leaks implementation content", async () => {
    const IMPLEMENTATION_SENTINEL = "SECRET_IMPLEMENTATION_DETAIL_67890";
    vi.mocked(runTypecheck)
      .mockResolvedValueOnce([
        {
          file: "x.test.ts",
          line: 1,
          column: 1,
          code: "TS2322",
          message: "bad",
        },
      ])
      .mockResolvedValueOnce([]);
    const readFile = vi.fn().mockResolvedValue(IMPLEMENTATION_SENTINEL);
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const workspace = { readFile, writeFile } as never;

    const complete = vi
      .fn()
      .mockResolvedValueOnce(result("it('x', () => { badSyntax( });"))
      .mockResolvedValueOnce(result("it('x', () => {});"));
    const provider: LLMProvider = { name: "fake", complete, stream: vi.fn() };

    await generateTestFile({
      path: "src/__tests__/unit/x.test.ts",
      task: "Write a test.",
      conventions: "conv",
      specs: "specs text",
      contracts: "export interface X {}",
      concern: "other",
      projectId: "p1",
      ctx,
      workspace,
      runtime: {} as never,
      containerId: "c1",
      provider,
    });

    expect(readFile).not.toHaveBeenCalled();
    const fixPromptText = (
      complete.mock.calls[1]![0] as { messages: LLMMessage[] }
    ).messages
      .map((m) => m.content)
      .join("\n");
    expect(fixPromptText).not.toContain(IMPLEMENTATION_SENTINEL);
    expect(fixPromptText).toContain("TS2322");
  });

  it("runTestAuthoringPhase generates one file per derived test case and never touches readFile", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([]);
    const readFile = vi.fn().mockResolvedValue("implementation code");
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const workspace = { readFile, writeFile } as never;
    const provider: LLMProvider = {
      name: "fake",
      complete: vi.fn().mockResolvedValue(result("it('x', () => {});")),
      stream: vi.fn(),
    };

    const outcome = await runTestAuthoringPhase({
      projectId: "p1",
      ctx,
      workspace,
      runtime: {} as never,
      containerId: "c1",
      template,
      specs,
      contractsContent: "export interface X {}",
      provider,
    });

    expect(outcome.status).toBe("completed");
    expect(outcome.testCases.length).toBeGreaterThan(0);
    expect(writeFile).toHaveBeenCalledTimes(outcome.testCases.length);
    expect(readFile).not.toHaveBeenCalled();
  });

  it("stops at the next file boundary once cancelled", async () => {
    vi.mocked(runTypecheck).mockResolvedValue([]);
    const workspace = {
      readFile: vi.fn(),
      writeFile: vi.fn().mockResolvedValue(undefined),
    } as never;
    const provider: LLMProvider = {
      name: "fake",
      complete: vi.fn().mockResolvedValue(result("it('x', () => {});")),
      stream: vi.fn(),
    };
    let calls = 0;
    const checkCancelled = vi.fn().mockImplementation(async () => {
      calls += 1;
      return calls > 1;
    });

    const outcome = await runTestAuthoringPhase({
      projectId: "p1",
      ctx,
      workspace,
      runtime: {} as never,
      containerId: "c1",
      template,
      specs,
      contractsContent: "export interface X {}",
      provider,
      checkCancelled,
    });

    expect(outcome.status).toBe("cancelled");
    expect(outcome.filesGenerated).toHaveLength(1);
  });
});

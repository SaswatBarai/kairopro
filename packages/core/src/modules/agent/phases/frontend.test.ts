import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../lib/context";
import type { AppStructureContent } from "../validators/app-structure";
import type { PrdContent } from "../validators/prd";
import type { TemplateManifest } from "../template";
import type { ApprovedSpecs } from "../workflow/steps/generation-context";

vi.mock("../../spec/spec.repository", () => ({
  findApprovedSpecsByTypes: vi.fn(),
}));
vi.mock("../../usage/usage.service", () => ({ emit: vi.fn() }));
vi.mock("../workflow/steps/generate-code", () => ({
  generateFile: vi.fn().mockResolvedValue({
    path: "generated",
    fixAttempts: 1,
    level: "full",
    omitted: false,
  }),
}));

import { generateFile } from "../workflow/steps/generate-code";
import { runFrontendPhase } from "./frontend";

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
    prismaClientPath: "src/lib/prisma.ts",
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
    invariants: ["i"],
    stateMachine: [{ entity: "Task", states: ["open"], transitions: [] }],
    permissionMatrix: [{ role: "User", entity: "Task", actions: ["create"] }],
    validationRules: ["v"],
    moneyRules: ["N/A"],
    sideEffects: ["s"],
  },
};

const appStructure: AppStructureContent = {
  pages: [
    { route: "/tasks", personas: ["User"] },
    { route: "/tasks/:id", personas: ["User"] },
  ],
  endpoints: [
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

function fakeWorkspace() {
  return { writeFile: vi.fn().mockResolvedValue(undefined) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(generateFile).mockResolvedValue({
    path: "generated",
    fixAttempts: 1,
    level: "full",
    omitted: false,
  });
});

describe("runFrontendPhase (AI-6) — generation order", () => {
  it("generates a page per app-structure page, and nothing else", async () => {
    const calls: string[] = [];
    vi.mocked(generateFile).mockImplementation(async (input) => {
      calls.push(input.path);
      return {
        path: input.path,
        fixAttempts: 1,
        level: "full",
        omitted: false,
      };
    });

    const result = await runFrontendPhase({
      projectId: "p1",
      ctx,
      workspace: fakeWorkspace(),
      runtime: {} as never,
      containerId: "c1",
      template,
      specs,
    });

    expect(result.status).toBe("completed");
    expect(calls).toEqual([
      "src/app/tasks/page.tsx",
      "src/app/tasks/[id]/page.tsx",
    ]);
    // Auth is generated in the backend phase, before the routes that import it.
    expect(calls).not.toContain("src/lib/auth.ts");
  });

  it("maps a :param route segment to Next.js's [param] convention", async () => {
    await runFrontendPhase({
      projectId: "p1",
      ctx,
      workspace: fakeWorkspace(),
      runtime: {} as never,
      containerId: "c1",
      template,
      specs,
    });

    const paths = vi.mocked(generateFile).mock.calls.map((c) => c[0].path);
    expect(paths).toContain("src/app/tasks/[id]/page.tsx");
  });

  it("tags pages as layout (degradable)", async () => {
    await runFrontendPhase({
      projectId: "p1",
      ctx,
      workspace: fakeWorkspace(),
      runtime: {} as never,
      containerId: "c1",
      template,
      specs,
    });

    const pageCall = vi
      .mocked(generateFile)
      .mock.calls.find((c) => c[0].path === "src/app/tasks/page.tsx")!;
    expect(pageCall[0].concern).toBe("layout");
  });

  it("tracks an omitted unit separately from files actually generated", async () => {
    vi.mocked(generateFile).mockResolvedValueOnce({
      path: "src/app/tasks/page.tsx",
      fixAttempts: 5,
      level: "omit",
      omitted: true,
    });

    const result = await runFrontendPhase({
      projectId: "p1",
      ctx,
      workspace: fakeWorkspace(),
      runtime: {} as never,
      containerId: "c1",
      template,
      specs,
    });

    expect(result.status).toBe("completed");
    expect(result.filesGenerated).not.toContain("src/app/tasks/page.tsx");
    expect(result.omitted).toContain("src/app/tasks/page.tsx");
  });
});

describe("runFrontendPhase (AI-6) — cancel", () => {
  it("stops at the next file boundary once cancelled", async () => {
    let calls = 0;
    const checkCancelled = vi.fn().mockImplementation(async () => {
      calls += 1;
      return calls > 1; // cancel after the first page
    });

    const result = await runFrontendPhase({
      projectId: "p1",
      ctx,
      workspace: fakeWorkspace(),
      runtime: {} as never,
      containerId: "c1",
      template,
      specs,
      checkCancelled,
    });

    expect(result.status).toBe("cancelled");
    expect(result.filesGenerated).toEqual(["src/app/tasks/page.tsx"]);
    expect(generateFile).toHaveBeenCalledTimes(1);
  });
});

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
vi.mock("../workflow/steps/generate-data-model", () => ({
  validatePrismaSchema: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../workflow/steps/freeze-contracts", () => ({
  freezeContracts: vi.fn().mockResolvedValue({
    path: "src/lib/contracts.ts",
    fixAttempts: 1,
    level: "full",
    omitted: false,
  }),
}));
vi.mock("../workflow/steps/generate-code", () => ({
  generateFile: vi.fn().mockResolvedValue({
    path: "generated",
    fixAttempts: 1,
    level: "full",
    omitted: false,
  }),
}));

import { validatePrismaSchema } from "../workflow/steps/generate-data-model";
import { freezeContracts } from "../workflow/steps/freeze-contracts";
import { generateFile } from "../workflow/steps/generate-code";
import { runBackendPhase } from "./backend";

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
    invariants: ["i"],
    stateMachine: [{ entity: "Task", states: ["open"], transitions: [] }],
    permissionMatrix: [{ role: "User", entity: "Task", actions: ["create"] }],
    validationRules: ["v"],
    moneyRules: ["N/A"],
    sideEffects: ["s"],
  },
};

const appStructure: AppStructureContent = {
  pages: [{ route: "/tasks", personas: ["User"] }],
  endpoints: [
    {
      method: "GET",
      path: "/api/tasks",
      requestType: "ListTasksRequest",
      responseType: "ListTasksResponse",
    },
    {
      method: "POST",
      path: "/api/tasks",
      requestType: "CreateTaskRequest",
      responseType: "CreateTaskResponse",
    },
    {
      method: "GET",
      path: "/api/health",
      requestType: "HealthRequest",
      responseType: "HealthResponse",
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

function fakeWorkspace(schemaHeader = "datasource db {}\n") {
  return {
    readFile: vi.fn().mockResolvedValue(schemaHeader),
    writeFile: vi.fn().mockResolvedValue(undefined),
  } as never;
}

function fakeRuntime(exitCode = 0) {
  return {
    exec: vi.fn().mockResolvedValue({ exitCode, stdout: "", stderr: "" }),
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(validatePrismaSchema).mockResolvedValue(
    "model Task { id String @id }",
  );
  vi.mocked(freezeContracts).mockResolvedValue({
    path: "src/lib/contracts.ts",
    fixAttempts: 1,
    level: "full",
    omitted: false,
  });
  vi.mocked(generateFile).mockResolvedValue({
    path: "generated",
    fixAttempts: 1,
    level: "full",
    omitted: false,
  });
});

describe("runBackendPhase (AI-6) — generation order", () => {
  it("enforces schema → migrate → freeze-contracts → API routes, in that order", async () => {
    const calls: string[] = [];
    const workspace = fakeWorkspace();
    (
      workspace as { writeFile: ReturnType<typeof vi.fn> }
    ).writeFile.mockImplementation(async () => {
      calls.push("schema:write");
    });
    const runtime = fakeRuntime();
    (runtime as { exec: ReturnType<typeof vi.fn> }).exec.mockImplementation(
      async () => {
        calls.push("migrate");
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    );
    vi.mocked(freezeContracts).mockImplementation(async () => {
      calls.push("freeze-contracts");
      return {
        path: "src/lib/contracts.ts",
        fixAttempts: 1,
        level: "full",
        omitted: false,
      };
    });
    vi.mocked(generateFile).mockImplementation(async (input) => {
      calls.push(`route:${input.path}`);
      return {
        path: input.path,
        fixAttempts: 1,
        level: "full",
        omitted: false,
      };
    });

    await runBackendPhase({
      projectId: "p1",
      ctx,
      workspace,
      runtime,
      containerId: "c1",
      template,
      specs,
    });

    expect(calls[0]).toBe("schema:write");
    expect(calls[1]).toBe("migrate");
    expect(calls[2]).toBe("freeze-contracts");
    expect(calls.slice(3).every((c) => c.startsWith("route:"))).toBe(true);
  });

  it("a schema validation failure halts before migrate, freeze-contracts, or any route", async () => {
    vi.mocked(validatePrismaSchema).mockRejectedValue(new Error("bad schema"));
    const workspace = fakeWorkspace();
    const runtime = fakeRuntime();

    await expect(
      runBackendPhase({
        projectId: "p1",
        ctx,
        workspace,
        runtime,
        containerId: "c1",
        template,
        specs,
      }),
    ).rejects.toThrow("bad schema");

    expect(
      (runtime as { exec: ReturnType<typeof vi.fn> }).exec,
    ).not.toHaveBeenCalled();
    expect(freezeContracts).not.toHaveBeenCalled();
    expect(generateFile).not.toHaveBeenCalled();
  });

  it("a migrate failure halts before freeze-contracts or any route", async () => {
    const runtime = fakeRuntime(1); // non-zero exit
    const workspace = fakeWorkspace();

    await expect(
      runBackendPhase({
        projectId: "p1",
        ctx,
        workspace,
        runtime,
        containerId: "c1",
        template,
        specs,
      }),
    ).rejects.toThrow();

    expect(freezeContracts).not.toHaveBeenCalled();
    expect(generateFile).not.toHaveBeenCalled();
  });

  it("groups every HTTP method on the same path into a single route file, generated once", async () => {
    const workspace = fakeWorkspace();
    const runtime = fakeRuntime();

    const result = await runBackendPhase({
      projectId: "p1",
      ctx,
      workspace,
      runtime,
      containerId: "c1",
      template,
      specs,
    });

    expect(result.status).toBe("completed");
    // 3 endpoints, 2 distinct paths (/api/tasks x2 methods, /api/health x1)
    // → exactly 2 generateFile calls for routes, not 3.
    expect(generateFile).toHaveBeenCalledTimes(2);
    const paths = vi.mocked(generateFile).mock.calls.map((c) => c[0].path);
    expect(paths).toContain("src/app/api/tasks/route.ts");
    expect(paths).toContain("src/app/api/health/route.ts");

    const tasksCall = vi
      .mocked(generateFile)
      .mock.calls.find((c) => c[0].path === "src/app/api/tasks/route.ts")!;
    expect(tasksCall[0].task).toContain("GET /api/tasks");
    expect(tasksCall[0].task).toContain("POST /api/tasks");
  });

  it("tags omitted files separately from files actually generated", async () => {
    vi.mocked(generateFile).mockResolvedValueOnce({
      path: "src/app/api/tasks/route.ts",
      fixAttempts: 5,
      level: "omit",
      omitted: true,
    });
    const workspace = fakeWorkspace();
    const runtime = fakeRuntime();

    const result = await runBackendPhase({
      projectId: "p1",
      ctx,
      workspace,
      runtime,
      containerId: "c1",
      template,
      specs,
    });

    expect(result.status).toBe("completed");
    expect(result.filesGenerated).not.toContain("src/app/api/tasks/route.ts");
    expect(result.omitted).toContain("src/app/api/tasks/route.ts");
  });
});

describe("runBackendPhase (AI-6) — concern tagging (rules.ts input)", () => {
  it("tags a mutating endpoint on a permission-matrix-governed entity as authorization", async () => {
    const workspace = fakeWorkspace();
    const runtime = fakeRuntime();

    await runBackendPhase({
      projectId: "p1",
      ctx,
      workspace,
      runtime,
      containerId: "c1",
      template,
      specs,
    });

    const tasksCall = vi
      .mocked(generateFile)
      .mock.calls.find((c) => c[0].path === "src/app/api/tasks/route.ts")!;
    // /api/tasks groups GET + POST; POST mutates the PRD-governed "Task"
    // entity, so the whole file is tagged authorization — never GET alone.
    expect(tasksCall[0].concern).toBe("authorization");
  });

  it("tags an endpoint outside the permission matrix and with no money vocabulary as other", async () => {
    const workspace = fakeWorkspace();
    const runtime = fakeRuntime();

    await runBackendPhase({
      projectId: "p1",
      ctx,
      workspace,
      runtime,
      containerId: "c1",
      template,
      specs,
    });

    const healthCall = vi
      .mocked(generateFile)
      .mock.calls.find((c) => c[0].path === "src/app/api/health/route.ts")!;
    expect(healthCall[0].concern).toBe("other");
  });

  it("tags an endpoint whose types mention money vocabulary as money-handling", async () => {
    const moneySpecs: ApprovedSpecs = {
      ...specs,
      appStructure: {
        ...appStructure,
        endpoints: [
          {
            method: "POST",
            path: "/api/checkout",
            requestType: "CreateCheckoutRequest",
            responseType: "CheckoutTotalResponse",
          },
        ],
      },
    };
    const workspace = fakeWorkspace();
    const runtime = fakeRuntime();

    await runBackendPhase({
      projectId: "p1",
      ctx,
      workspace,
      runtime,
      containerId: "c1",
      template,
      specs: moneySpecs,
    });

    const call = vi.mocked(generateFile).mock.calls[0]!;
    expect(call[0].concern).toBe("money-handling");
  });
});

describe("runBackendPhase (AI-6) — cancel", () => {
  it("stops at the next file boundary once the cancel flag is set, generating no routes", async () => {
    const workspace = fakeWorkspace();
    const runtime = fakeRuntime();
    let calls = 0;
    const checkCancelled = vi.fn().mockImplementation(async () => {
      calls += 1;
      return calls > 3; // cancel right after schema/migrate/contracts boundaries
    });

    const result = await runBackendPhase({
      projectId: "p1",
      ctx,
      workspace,
      runtime,
      containerId: "c1",
      template,
      specs,
      checkCancelled,
    });

    expect(result.status).toBe("cancelled");
    expect(generateFile).not.toHaveBeenCalled();
    expect(result.filesGenerated).toContain("prisma/schema.prisma");
    expect(result.filesGenerated).toContain("src/lib/contracts.ts");
  });

  it("cancelling before the very first boundary generates nothing at all", async () => {
    const workspace = fakeWorkspace();
    const runtime = fakeRuntime();
    const checkCancelled = vi.fn().mockResolvedValue(true);

    const result = await runBackendPhase({
      projectId: "p1",
      ctx,
      workspace,
      runtime,
      containerId: "c1",
      template,
      specs,
      checkCancelled,
    });

    expect(result.status).toBe("cancelled");
    expect(result.filesGenerated).toEqual([]);
    expect(validatePrismaSchema).not.toHaveBeenCalled();
  });
});

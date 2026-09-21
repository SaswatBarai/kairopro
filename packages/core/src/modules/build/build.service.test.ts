import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../lib/context";
import { ConflictError, NotFoundError } from "../../lib/errors";

vi.mock("../org/access", () => ({ ownerOf: vi.fn() }));
vi.mock("./build.repository", () => ({
  createBuildRow: vi.fn(),
  findActiveBuild: vi.fn(),
  findBuildById: vi.fn(),
  findBuildWithProject: vi.fn(),
  listBuildsByProject: vi.fn(),
  updateBuildRow: vi.fn(),
  createInternalErrorRow: vi.fn(),
}));
vi.mock("./workflow", () => ({ runWorkflow: vi.fn() }));
vi.mock("./logs", () => ({ emitLog: vi.fn() }));
vi.mock("../version/version.service", () => ({ recordVersion: vi.fn() }));
vi.mock("../usage/usage.service", () => ({ emit: vi.fn() }));
// The "generate" step's real body (scaffold → backend phase → frontend
// phase) is never invoked here — every test below mocks `runWorkflow`
// itself, so `buildSteps()`'s `run()` closures are only ever constructed,
// not called. These mocks exist purely to keep their module-level imports
// (which reach the database) from loading for real in a unit test.
vi.mock("../agent/phases/backend", () => ({ runBackendPhase: vi.fn() }));
vi.mock("../agent/phases/frontend", () => ({ runFrontendPhase: vi.fn() }));
vi.mock("../agent/template", () => ({ loadTemplate: vi.fn() }));
vi.mock("../agent/workflow/steps/scaffold", () => ({ scaffoldProject: vi.fn() }));
vi.mock("../agent/workflow/steps/generation-context", () => ({
  loadApprovedSpecs: vi.fn(),
}));
vi.mock("../../platform/workspace", () => ({ getWorkspaceStore: vi.fn() }));
vi.mock("../../platform/container", () => ({
  getContainerRuntime: vi.fn(() => ({
    provision: vi.fn(),
    exec: vi.fn(),
    execStream: vi.fn(),
    health: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
  })),
}));

import { ownerOf } from "../org/access";
import { runBackendPhase } from "../agent/phases/backend";
import { runFrontendPhase } from "../agent/phases/frontend";
import { loadTemplate } from "../agent/template";
import { scaffoldProject } from "../agent/workflow/steps/scaffold";
import { loadApprovedSpecs } from "../agent/workflow/steps/generation-context";
import { getWorkspaceStore } from "../../platform/workspace";
import {
  createBuildRow,
  createInternalErrorRow,
  findActiveBuild,
  findBuildById,
  findBuildWithProject,
  listBuildsByProject,
  updateBuildRow,
} from "./build.repository";
import { runWorkflow } from "./workflow";
import { emitLog } from "./logs";
import { recordVersion } from "../version/version.service";
import { emit as emitUsage } from "../usage/usage.service";
import {
  buildSteps,
  cancelBuild,
  executeBuild,
  getBuild,
  listBuilds,
  startBuild,
} from "./build.service";

const ctx: RequestContext = { userId: "u1", orgId: "o1" };
const project = {
  id: "prj1",
  orgId: "o1",
  userId: "u1",
  name: "TaskFlow",
  description: null,
  status: "SPECIFYING",
  templateId: "nextjs-shadcn",
  previewUrl: null,
  deployedUrl: null,
  workspacePath: "/workspaces/prj1",
  createdAt: new Date(),
  updatedAt: new Date(),
} as never;

function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "b1",
    projectId: "prj1",
    status: "QUEUED",
    startedAt: null,
    finishedAt: null,
    commitHash: null,
    previewUrl: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (updateBuildRow as ReturnType<typeof vi.fn>).mockImplementation(
    (id: string, data: Record<string, unknown>) =>
      Promise.resolve(buildRow({ id, ...data })),
  );
  (emitLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (emitUsage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (createInternalErrorRow as ReturnType<typeof vi.fn>).mockResolvedValue(
    undefined,
  );
});

describe("startBuild (BE-10)", () => {
  it("returns immediately with a QUEUED build", async () => {
    (ownerOf as ReturnType<typeof vi.fn>).mockResolvedValue(project);
    (findActiveBuild as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (createBuildRow as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildRow({ status: "QUEUED" }),
    );
    (runWorkflow as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}), // never resolves — proves start doesn't wait on it
    );

    const result = await startBuild("prj1", ctx);

    expect(result.status).toBe("QUEUED");
    expect(result.id).toBe("b1");
  });

  it("404s when the project is not accessible", async () => {
    (ownerOf as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(startBuild("prj1", ctx)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("refuses a second build while one is already active", async () => {
    (ownerOf as ReturnType<typeof vi.fn>).mockResolvedValue(project);
    (findActiveBuild as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildRow({ id: "b0", status: "RUNNING" }),
    );

    await expect(startBuild("prj1", ctx)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(createBuildRow).not.toHaveBeenCalled();
  });
});

describe("cancelBuild (BE-10)", () => {
  it("moves a RUNNING build to CANCELLED", async () => {
    (findBuildWithProject as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildRow({ status: "RUNNING", project }),
    );
    (ownerOf as ReturnType<typeof vi.fn>).mockResolvedValue(project);

    const result = await cancelBuild("b1", ctx);

    expect(result.status).toBe("CANCELLED");
    expect(updateBuildRow).toHaveBeenCalledWith("b1", { status: "CANCELLED" });
  });

  it("is idempotent — cancelling an already-CANCELLED build is a no-op returning the same state", async () => {
    (findBuildWithProject as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildRow({ status: "CANCELLED", project }),
    );
    (ownerOf as ReturnType<typeof vi.fn>).mockResolvedValue(project);

    const result = await cancelBuild("b1", ctx);

    expect(result.status).toBe("CANCELLED");
    expect(updateBuildRow).not.toHaveBeenCalled();
  });

  it("is a no-op on a build that already finished (SUCCEEDED/FAILED)", async () => {
    (findBuildWithProject as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildRow({ status: "SUCCEEDED", project }),
    );
    (ownerOf as ReturnType<typeof vi.fn>).mockResolvedValue(project);

    const result = await cancelBuild("b1", ctx);

    expect(result.status).toBe("SUCCEEDED");
    expect(updateBuildRow).not.toHaveBeenCalled();
  });

  it("404s a build outside the caller's org (never 403)", async () => {
    (findBuildWithProject as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildRow({ status: "RUNNING", project }),
    );
    (ownerOf as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(cancelBuild("b1", ctx)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("getBuild / listBuilds (BE-10)", () => {
  it("getBuild returns the current row shape", async () => {
    (findBuildWithProject as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildRow({ status: "SUCCEEDED", commitHash: "abc1234", project }),
    );
    (ownerOf as ReturnType<typeof vi.fn>).mockResolvedValue(project);

    const result = await getBuild("b1", ctx);
    expect(result.status).toBe("SUCCEEDED");
    expect(result.commitHash).toBe("abc1234");
  });

  it("listBuilds requires project access and maps every row", async () => {
    (ownerOf as ReturnType<typeof vi.fn>).mockResolvedValue(project);
    (listBuildsByProject as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildRow({ id: "b1" }),
      buildRow({ id: "b2" }),
    ]);

    const result = await listBuilds("prj1", ctx);
    expect(result.map((b) => b.id)).toEqual(["b1", "b2"]);
  });
});

describe("executeBuild (BE-10)", () => {
  it("marks the build RUNNING, then SUCCEEDED, and records usage on completion", async () => {
    (runWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue("completed");

    await executeBuild("b1", project, ctx);

    expect(updateBuildRow).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({ status: "RUNNING" }),
    );
    expect(updateBuildRow).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({ status: "SUCCEEDED" }),
    );
    expect(emitUsage).toHaveBeenCalledWith("BUILD", 1, ctx, {
      projectId: "prj1",
      buildId: "b1",
    });
    expect(emitLog).toHaveBeenCalledWith(
      "b1",
      "EVENT",
      expect.stringContaining('"status":"SUCCEEDED"'),
    );
  });

  it("leaves a cancelled run CANCELLED, without recording usage", async () => {
    (runWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue("cancelled");

    await executeBuild("b1", project, ctx);

    expect(updateBuildRow).not.toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({ status: "SUCCEEDED" }),
    );
    expect(emitUsage).not.toHaveBeenCalled();
    expect(emitLog).toHaveBeenCalledWith(
      "b1",
      "EVENT",
      expect.stringContaining('"status":"CANCELLED"'),
    );
  });

  it("on a step failure, writes InternalError, marks FAILED, and emits only a user-safe message", async () => {
    const cause = new Error("container exploded: secret-token-xyz");
    (runWorkflow as ReturnType<typeof vi.fn>).mockRejectedValue(cause);

    await executeBuild("b1", project, ctx);

    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({
        buildId: "b1",
        message: "container exploded: secret-token-xyz",
      }),
    );
    expect(updateBuildRow).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({ status: "FAILED" }),
    );

    const errorLogCall = (emitLog as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => call[1] === "EVENT" && String(call[2]).includes('"event":"error"'),
    );
    expect(errorLogCall).toBeDefined();
    const content = String(errorLogCall![2]);
    expect(content).not.toContain("secret-token-xyz");
    expect(content).not.toContain(cause.stack ?? "\u0000never-matches");
  });

  it("writing the InternalError row failing does not prevent the build from being marked FAILED", async () => {
    (runWorkflow as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    (createInternalErrorRow as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("db unreachable"),
    );

    await expect(executeBuild("b1", project, ctx)).resolves.toBeUndefined();
    expect(updateBuildRow).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({ status: "FAILED" }),
    );
  });

  it("passes a checkpoint-commit onCancelled callback through to the workflow", async () => {
    (runWorkflow as ReturnType<typeof vi.fn>).mockImplementation(
      async (input: { onCancelled: (stepCtx: unknown, name: string) => Promise<void> }) => {
        await input.onCancelled(
          { buildId: "b1", projectId: "prj1", ctx, state: {} },
          "generate",
        );
        return "cancelled";
      },
    );
    (recordVersion as ReturnType<typeof vi.fn>).mockResolvedValue({
      hash: "def5678",
    });

    await executeBuild("b1", project, ctx);

    expect(recordVersion).toHaveBeenCalledWith(
      "prj1",
      "/workspaces/prj1",
      "Checkpoint: cancelled during generate",
      ctx,
    );
    expect(updateBuildRow).toHaveBeenCalledWith("b1", {
      commitHash: "def5678",
    });
  });
});

describe("buildSteps — generate step (BE-10 orchestration of AI-6/AI-7)", () => {
  const fakeRuntime = { exec: vi.fn(), execStream: vi.fn() } as never;
  const fakeTemplate = { id: "nextjs-shadcn", conventions: {} } as never;
  const fakeSpecs = { prd: {} } as never;

  function generateStep() {
    const steps = buildSteps(fakeRuntime, project);
    const step = steps.find((s) => s.name === "generate")!;
    return step;
  }

  beforeEach(() => {
    (getWorkspaceStore as ReturnType<typeof vi.fn>).mockReturnValue({
      resolve: vi.fn().mockResolvedValue("/workspaces/prj1"),
    });
    (scaffoldProject as ReturnType<typeof vi.fn>).mockResolvedValue({
      templateId: "nextjs-shadcn",
      filesCopied: ["package.json"],
      commitHash: "abc1234",
    });
    (loadTemplate as ReturnType<typeof vi.fn>).mockReturnValue(fakeTemplate);
    (loadApprovedSpecs as ReturnType<typeof vi.fn>).mockResolvedValue(fakeSpecs);
    (runBackendPhase as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "completed",
      filesGenerated: ["prisma/schema.prisma", "src/lib/contracts.ts"],
      omitted: [],
      contractsPath: "src/lib/contracts.ts",
    });
    (runFrontendPhase as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "completed",
      filesGenerated: ["src/app/page.tsx", "src/lib/auth.ts"],
      omitted: [],
    });
    (findBuildById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildRow({ status: "RUNNING" }),
    );
  });

  it("scaffolds, loads the template and specs, then runs backend before frontend", async () => {
    const calls: string[] = [];
    (scaffoldProject as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      calls.push("scaffold");
      return { templateId: "nextjs-shadcn", filesCopied: [], commitHash: null };
    });
    (runBackendPhase as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      calls.push("backend");
      return { status: "completed", filesGenerated: [], omitted: [], contractsPath: "x" };
    });
    (runFrontendPhase as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      calls.push("frontend");
      return { status: "completed", filesGenerated: [], omitted: [] };
    });

    await generateStep().run({
      buildId: "b1",
      projectId: "prj1",
      ctx,
      state: { containerId: "c1" },
    });

    expect(calls).toEqual(["scaffold", "backend", "frontend"]);
    expect(scaffoldProject).toHaveBeenCalledWith({
      workspacePath: "/workspaces/prj1",
      templateId: "nextjs-shadcn",
    });
    expect(loadTemplate).toHaveBeenCalledWith("nextjs-shadcn");
    expect(loadApprovedSpecs).toHaveBeenCalledWith("prj1", ctx);
  });

  it("passes the same host workspace path as cwd to both phases and the running container id", async () => {
    await generateStep().run({
      buildId: "b1",
      projectId: "prj1",
      ctx,
      state: { containerId: "c1" },
    });

    expect(runBackendPhase).toHaveBeenCalledWith(
      expect.objectContaining({
        containerId: "c1",
        cwd: "/workspaces/prj1",
        template: fakeTemplate,
        specs: fakeSpecs,
      }),
    );
    expect(runFrontendPhase).toHaveBeenCalledWith(
      expect.objectContaining({ containerId: "c1", cwd: "/workspaces/prj1" }),
    );
  });

  it("stops before the frontend phase when the backend phase reports cancellation", async () => {
    (runBackendPhase as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "cancelled",
      filesGenerated: ["prisma/schema.prisma"],
      omitted: [],
    });

    await generateStep().run({
      buildId: "b1",
      projectId: "prj1",
      ctx,
      state: { containerId: "c1" },
    });

    expect(runFrontendPhase).not.toHaveBeenCalled();
  });

  it("the checkCancelled hook passed to each phase reads the Build row's live status", async () => {
    await generateStep().run({
      buildId: "b1",
      projectId: "prj1",
      ctx,
      state: { containerId: "c1" },
    });

    const backendInput = (runBackendPhase as ReturnType<typeof vi.fn>).mock
      .calls[0]![0] as { checkCancelled: () => Promise<boolean> };
    (findBuildById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildRow({ status: "CANCELLED" }),
    );
    await expect(backendInput.checkCancelled()).resolves.toBe(true);

    (findBuildById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildRow({ status: "RUNNING" }),
    );
    await expect(backendInput.checkCancelled()).resolves.toBe(false);
  });

  it("a degradation from either phase is emitted as a code event, naming the unit and level", async () => {
    (runBackendPhase as ReturnType<typeof vi.fn>).mockImplementation(
      async (input: {
        onDegrade: (unit: string, step: { level: string; message: string }) => void;
      }) => {
        input.onDegrade("src/app/api/tasks/route.ts", {
          level: "simpler",
          message: "src/app/api/tasks/route.ts was simplified.",
        });
        return { status: "completed", filesGenerated: [], omitted: [], contractsPath: "x" };
      },
    );

    await generateStep().run({
      buildId: "b1",
      projectId: "prj1",
      ctx,
      state: { containerId: "c1" },
    });

    const codeEventCall = (emitLog as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => call[1] === "EVENT" && String(call[2]).includes('"event":"code"'),
    );
    expect(codeEventCall).toBeDefined();
    expect(String(codeEventCall![2])).toContain("src/app/api/tasks/route.ts");
    expect(String(codeEventCall![2])).toContain("simpler");
  });

  it("reports the total files generated and any omitted units when both phases complete", async () => {
    await generateStep().run({
      buildId: "b1",
      projectId: "prj1",
      ctx,
      state: { containerId: "c1" },
    });

    const summaryCall = (emitLog as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => call[1] === "STDOUT" && String(call[2]).startsWith("Generated"),
    );
    expect(summaryCall).toBeDefined();
    expect(String(summaryCall![2])).toContain("4 file(s)");
  });
});

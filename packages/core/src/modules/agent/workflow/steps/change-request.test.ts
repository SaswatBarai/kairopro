import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../../lib/context";
import { ConflictError } from "../../../../lib/errors";

vi.mock("../../../../platform/db/client", () => ({ db: {} }));
vi.mock("../../../org/access", () => ({ ownerOf: vi.fn() }));
vi.mock("../../../build/build.repository", () => ({
  createInternalErrorRow: vi.fn().mockResolvedValue({ id: "err-1" }),
}));
vi.mock("../../change/change.repository", () => ({
  createChangeRequestRow: vi.fn(),
  findChangeRequestById: vi.fn(),
  findChangeRequestWithProject: vi.fn(),
  listChangeRequestsByProject: vi.fn(),
  updateChangeRequestRow: vi.fn(),
}));
vi.mock("../../context/change-summary", () => ({
  buildChangeSummary: vi.fn().mockResolvedValue("No prior changes."),
}));
vi.mock("../../context/retrieve", () => ({
  retrieve: vi.fn().mockResolvedValue({
    summary: "project summary",
    files: [],
    partial: false,
    omitted: [],
  }),
}));
vi.mock("../../../../platform/workspace", () => ({
  getWorkspaceStore: vi.fn(() => ({
    resolve: vi.fn().mockResolvedValue("/workspaces/p1"),
  })),
}));
vi.mock("../../../../platform/container", () => ({
  getContainerRuntime: vi.fn(() => ({
    provision: vi.fn().mockResolvedValue({ containerId: "c1", previewUrl: "" }),
    stop: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock("../../template", () => ({
  loadTemplate: vi.fn(() => ({
    conventions: { contractsPath: "src/lib/contracts.ts" },
  })),
  renderConventions: vi.fn(() => "conventions text"),
}));
vi.mock("./generation-context", () => ({
  loadApprovedSpecs: vi.fn().mockResolvedValue({
    prd: { businessRules: {} },
    appStructure: { pages: [] },
  }),
  renderSpecsForPrompt: vi.fn(() => "specs text"),
}));
vi.mock("../../llm", () => ({
  getLLMProvider: vi.fn(() => ({ name: "fake" })),
}));
vi.mock("../../llm/router", () => ({ modelFor: vi.fn(() => "fake-model") }));
vi.mock("../../llm/structured", () => ({ completeStructured: vi.fn() }));
vi.mock("../../prompts/loader", () => ({
  renderPrompt: vi.fn(() => "rendered prompt"),
}));
vi.mock("./generate-code", () => ({ generateFile: vi.fn() }));
vi.mock("./freeze-contracts", () => ({ freezeContracts: vi.fn() }));
vi.mock("../../phases/test-authoring", () => ({ deriveTestCases: vi.fn() }));
vi.mock("./run-tests", async () => {
  const actual =
    await vi.importActual<typeof import("./run-tests")>("./run-tests");
  return { ...actual, runTestPhase: vi.fn() };
});
vi.mock("../../../version/version.service", () => ({ recordVersion: vi.fn() }));
vi.mock("../../../version/git.service", () => ({
  discardUncommittedChanges: vi.fn().mockResolvedValue(undefined),
}));

import { ownerOf } from "../../../org/access";
import { createInternalErrorRow } from "../../../build/build.repository";
import {
  createChangeRequestRow,
  findChangeRequestById,
  findChangeRequestWithProject,
  updateChangeRequestRow,
} from "../../change/change.repository";
import { completeStructured } from "../../llm/structured";
import { generateFile } from "./generate-code";
import { freezeContracts } from "./freeze-contracts";
import { deriveTestCases } from "../../phases/test-authoring";
import { runTestPhase, UnresolvedTestFailuresError } from "./run-tests";
import { recordVersion } from "../../../version/version.service";
import { discardUncommittedChanges } from "../../../version/git.service";
import {
  approveChangeRequest,
  executeChangeRequest,
  planChangeRequest,
  requestChange,
} from "./change-request";

const ctx: RequestContext = { userId: "u1", orgId: "o1" };
const project = { id: "p1", templateId: "nextjs-shadcn" } as never;

function changeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "cr-1",
    projectId: "p1",
    status: "PLANNING",
    request: "let managers mark tasks urgent",
    plan: null,
    commitHash: null,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const PLAN = {
  summary: "Add an urgent flag to tasks",
  diffSummary: "Tasks gain an urgent boolean; managers can toggle it.",
  tasks: [{ path: "src/app/tasks/page.tsx", task: "Show an urgent toggle." }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ownerOf).mockResolvedValue(project);
  vi.mocked(createChangeRequestRow).mockResolvedValue(changeRow() as never);
  vi.mocked(updateChangeRequestRow).mockImplementation((id, data) =>
    Promise.resolve({ ...changeRow(), ...data } as never),
  );
  vi.mocked(deriveTestCases).mockReturnValue([]);
});

describe("requestChange (AI-9)", () => {
  it("creates a PLANNING row and returns immediately", async () => {
    const result = await requestChange("p1", { request: "x" }, ctx);
    expect(result.status).toBe("PLANNING");
    expect(createChangeRequestRow).toHaveBeenCalledWith("p1", "x");
  });
});

describe("planChangeRequest (AI-9)", () => {
  it("produces a plan and moves to AWAITING_APPROVAL without touching any file", async () => {
    vi.mocked(findChangeRequestById).mockResolvedValue(changeRow() as never);
    vi.mocked(completeStructured).mockResolvedValue(PLAN);

    await planChangeRequest("cr-1", project, ctx);

    expect(updateChangeRequestRow).toHaveBeenCalledWith("cr-1", {
      status: "AWAITING_APPROVAL",
      plan: PLAN,
    });
    expect(generateFile).not.toHaveBeenCalled();
  });

  it("does nothing further when cancelled before the plan completes", async () => {
    vi.mocked(findChangeRequestById)
      .mockResolvedValueOnce(changeRow() as never) // initial cancel check
      .mockResolvedValueOnce(changeRow() as never) // row lookup
      .mockResolvedValueOnce(changeRow({ status: "CANCELLED" }) as never); // post-completion check
    vi.mocked(completeStructured).mockResolvedValue(PLAN);

    await planChangeRequest("cr-1", project, ctx);

    expect(updateChangeRequestRow).not.toHaveBeenCalledWith(
      "cr-1",
      expect.objectContaining({ status: "AWAITING_APPROVAL" }),
    );
  });

  it("marks the request FAILED and logs an InternalError when planning throws", async () => {
    vi.mocked(findChangeRequestById).mockResolvedValue(changeRow() as never);
    vi.mocked(completeStructured).mockRejectedValue(new Error("model down"));

    await planChangeRequest("cr-1", project, ctx);

    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({ step: "change-request:planning" }),
    );
    expect(updateChangeRequestRow).toHaveBeenCalledWith(
      "cr-1",
      expect.objectContaining({ status: "FAILED" }),
    );
  });
});

describe("approveChangeRequest (AI-9)", () => {
  it("requires the request to be awaiting approval", async () => {
    vi.mocked(findChangeRequestWithProject).mockResolvedValue(
      changeRow({ status: "PLANNING" }) as never,
    );

    await expect(approveChangeRequest("cr-1", ctx)).rejects.toThrow(
      ConflictError,
    );
  });
});

describe("executeChangeRequest (AI-9)", () => {
  const approvedRow = () =>
    changeRow({ status: "APPLYING", plan: PLAN }) as never;

  it("generates each planned file, runs regression tests, and commits once on success", async () => {
    vi.mocked(findChangeRequestById).mockResolvedValue(approvedRow());
    vi.mocked(generateFile).mockResolvedValue({
      path: "x",
      fixAttempts: 1,
      level: "full",
      omitted: false,
    });
    vi.mocked(runTestPhase).mockResolvedValue({
      status: "green",
      reports: {},
    } as never);
    vi.mocked(recordVersion).mockResolvedValue({
      id: "v1",
      hash: "abc1234",
    } as never);

    await executeChangeRequest("cr-1", project, ctx);

    expect(generateFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: "src/app/tasks/page.tsx" }),
    );
    expect(recordVersion).toHaveBeenCalledWith(
      "p1",
      "/workspaces/p1",
      PLAN.summary,
      ctx,
    );
    expect(updateChangeRequestRow).toHaveBeenCalledWith("cr-1", {
      status: "SUCCEEDED",
      commitHash: "abc1234",
      finishedAt: expect.any(Date),
    });
    expect(discardUncommittedChanges).not.toHaveBeenCalled();
  });

  it("regenerates the contracts file through freezeContracts, not a generic generateFile call", async () => {
    const contractPlan = {
      ...PLAN,
      tasks: [
        { path: "src/lib/contracts.ts", task: "Add an urgent field type." },
      ],
    };
    vi.mocked(findChangeRequestById).mockResolvedValue(
      changeRow({ status: "APPLYING", plan: contractPlan }) as never,
    );
    vi.mocked(runTestPhase).mockResolvedValue({
      status: "green",
      reports: {},
    } as never);
    vi.mocked(recordVersion).mockResolvedValue({
      id: "v1",
      hash: "def5678",
    } as never);

    await executeChangeRequest("cr-1", project, ctx);

    expect(freezeContracts).toHaveBeenCalledWith(
      expect.objectContaining({ contractsPath: "src/lib/contracts.ts" }),
    );
    expect(generateFile).not.toHaveBeenCalled();
  });

  it("blocks completion and discards uncommitted work when regression tests fail", async () => {
    vi.mocked(findChangeRequestById).mockResolvedValue(approvedRow());
    vi.mocked(deriveTestCases).mockReturnValue([
      { level: "unit", path: "x.test.ts" },
    ] as never);
    vi.mocked(generateFile).mockResolvedValue({
      path: "x",
      fixAttempts: 1,
      level: "full",
      omitted: false,
    });
    vi.mocked(runTestPhase).mockRejectedValue(
      new UnresolvedTestFailuresError({
        message: "tests failed",
        failures: [],
      }),
    );

    await executeChangeRequest("cr-1", project, ctx);

    expect(discardUncommittedChanges).toHaveBeenCalledWith("/workspaces/p1");
    expect(recordVersion).not.toHaveBeenCalled();
    expect(updateChangeRequestRow).toHaveBeenCalledWith(
      "cr-1",
      expect.objectContaining({ status: "FAILED" }),
    );
    expect(createInternalErrorRow).toHaveBeenCalledWith(
      expect.objectContaining({ step: "change-request:apply" }),
    );
  });

  it("stops applying and discards uncommitted work when cancelled mid-apply, leaving the workspace unchanged", async () => {
    vi.mocked(findChangeRequestById)
      .mockResolvedValueOnce(approvedRow()) // initial cancel check
      .mockResolvedValueOnce(approvedRow()) // row + plan lookup
      .mockResolvedValueOnce(changeRow({ status: "CANCELLED" }) as never); // per-task cancel check

    await executeChangeRequest("cr-1", project, ctx);

    expect(discardUncommittedChanges).toHaveBeenCalledWith("/workspaces/p1");
    expect(generateFile).not.toHaveBeenCalled();
    expect(recordVersion).not.toHaveBeenCalled();
    // Status is left exactly as cancelChangeRequest already set it — this
    // function never overwrites CANCELLED with anything else.
    expect(updateChangeRequestRow).not.toHaveBeenCalledWith(
      "cr-1",
      expect.objectContaining({ status: "SUCCEEDED" }),
    );
    expect(updateChangeRequestRow).not.toHaveBeenCalledWith(
      "cr-1",
      expect.objectContaining({ status: "FAILED" }),
    );
  });
});

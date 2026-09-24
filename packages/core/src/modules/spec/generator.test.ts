import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../lib/context";
import { NotFoundError, ProviderError } from "../../lib/errors";

vi.mock("../input/input.service", () => ({ listInputs: vi.fn() }));
vi.mock("./spec.service", () => ({ createSpec: vi.fn(), listSpecs: vi.fn() }));
vi.mock("../agent/workflow/steps/pm-questions", () => ({
  generatePmQuestions: vi.fn(),
}));
vi.mock("../agent/workflow/steps/generate-prd", () => ({
  generatePrd: vi.fn(),
  formatPrdForPrompt: vi.fn(() => "PRD as text"),
}));
vi.mock("../agent/workflow/steps/revise-prd", () => ({
  revisePrd: vi.fn(),
}));
vi.mock("../agent/workflow/steps/generate-design", () => ({
  generateDesign: vi.fn(),
}));
vi.mock("../agent/workflow/steps/generate-data-model", () => ({
  generateDataModel: vi.fn(),
}));
vi.mock("../agent/workflow/steps/generate-app-structure", () => ({
  generateAppStructure: vi.fn(),
}));

const { publish } = vi.hoisted(() => ({ publish: vi.fn() }));
vi.mock("../../platform/events", () => ({ eventBus: { publish } }));

import { listInputs } from "../input/input.service";
import { createSpec, listSpecs } from "./spec.service";
import { revisePrd } from "../agent/workflow/steps/revise-prd";
import { generatePmQuestions } from "../agent/workflow/steps/pm-questions";
import { generatePrd } from "../agent/workflow/steps/generate-prd";
import { generateDesign } from "../agent/workflow/steps/generate-design";
import { generateDataModel } from "../agent/workflow/steps/generate-data-model";
import { generateAppStructure } from "../agent/workflow/steps/generate-app-structure";
import { RealSpecGenerator } from "./generator";

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };
const projectId = "prj-1";

const prd = {
  overview: "x",
  goals: [],
  nonGoals: [],
  personas: [],
  userStories: [],
  assumptions: [],
  businessRules: {
    invariants: [],
    stateMachine: [],
    permissionMatrix: [],
    validationRules: [],
    moneyRules: [],
    sideEffects: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listInputs).mockResolvedValue([
    {
      id: "inp-1",
      projectId,
      kind: "TEXT",
      originalName: null,
      mimeType: null,
      sizeBytes: 10,
      extraction: "Build a todo app.",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ] as never);
  vi.mocked(generatePmQuestions).mockResolvedValue([
    { id: "q1", question: "Q1?", options: ["a", "b"] },
  ] as never);
  vi.mocked(generatePrd).mockResolvedValue(prd as never);
  vi.mocked(generateDesign).mockResolvedValue("---\ncolor: {}\n---\n" as never);
  vi.mocked(generateDataModel).mockResolvedValue(
    "model Task { id String @id }" as never,
  );
  vi.mocked(generateAppStructure).mockResolvedValue({
    pages: [],
    endpoints: [],
    components: [],
  } as never);
});

describe("RealSpecGenerator (AI-5)", () => {
  it("runs the full pipeline and creates all four specs", async () => {
    await RealSpecGenerator.generate(projectId, ctx);

    expect(createSpec).toHaveBeenCalledWith(projectId, "PRD", prd, ctx);
    expect(createSpec).toHaveBeenCalledWith(
      projectId,
      "DESIGN",
      { markdown: "---\ncolor: {}\n---\n" },
      ctx,
    );
    expect(createSpec).toHaveBeenCalledWith(
      projectId,
      "DATA_MODEL",
      { schema: "model Task { id String @id }" },
      ctx,
    );
    expect(createSpec).toHaveBeenCalledWith(
      projectId,
      "APP_STRUCTURE",
      { pages: [], endpoints: [], components: [] },
      ctx,
    );
  });

  it("publishes started/completed progress events for every step, in order", async () => {
    await RealSpecGenerator.generate(projectId, ctx);

    const events = publish.mock.calls.map(([channel, event]) => ({
      channel,
      step: event.step,
      status: event.status,
    }));

    expect(events).toEqual([
      {
        channel: "spec-generation:prj-1",
        step: "pm-questions",
        status: "started",
      },
      {
        channel: "spec-generation:prj-1",
        step: "pm-questions",
        status: "completed",
      },
      { channel: "spec-generation:prj-1", step: "prd", status: "started" },
      { channel: "spec-generation:prj-1", step: "prd", status: "completed" },
      { channel: "spec-generation:prj-1", step: "design", status: "started" },
      { channel: "spec-generation:prj-1", step: "design", status: "completed" },
      {
        channel: "spec-generation:prj-1",
        step: "data-model",
        status: "started",
      },
      {
        channel: "spec-generation:prj-1",
        step: "data-model",
        status: "completed",
      },
      {
        channel: "spec-generation:prj-1",
        step: "app-structure",
        status: "started",
      },
      {
        channel: "spec-generation:prj-1",
        step: "app-structure",
        status: "completed",
      },
    ]);
  });

  it("throws when the project has no usable input, before calling any step", async () => {
    vi.mocked(listInputs).mockResolvedValue([
      {
        id: "inp-1",
        projectId,
        kind: "FILE",
        originalName: "x.png",
        mimeType: "image/png",
        sizeBytes: 10,
        extraction: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ] as never);

    await expect(RealSpecGenerator.generate(projectId, ctx)).rejects.toThrow(
      ProviderError,
    );
    expect(generatePmQuestions).not.toHaveBeenCalled();
  });

  it("publishes a failed event and stops the pipeline when a step throws", async () => {
    vi.mocked(generateDesign).mockRejectedValue(new Error("design blew up"));

    await expect(RealSpecGenerator.generate(projectId, ctx)).rejects.toThrow(
      "design blew up",
    );

    expect(createSpec).not.toHaveBeenCalledWith(
      projectId,
      "DATA_MODEL",
      expect.anything(),
      ctx,
    );
    const events = publish.mock.calls.map(([, event]) => event);
    const designFailed = events.find(
      (e) => e.step === "design" && e.status === "failed",
    );
    expect(designFailed).toMatchObject({ message: "design blew up" });
  });
});

describe("RealSpecGenerator.revise", () => {
  const validPrd = {
    overview: "A task manager.",
    goals: ["Track tasks"],
    nonGoals: [],
    personas: [{ name: "Member", description: "Works on tasks" }],
    userStories: [{ persona: "Member", story: "I can add a task" }],
    assumptions: [{ questionId: "q1", assumption: "Everyone sees all tasks" }],
    businessRules: {
      invariants: ["A task belongs to one project"],
      stateMachine: [
        {
          entity: "Task",
          states: ["open", "done"],
          transitions: [{ from: "open", to: "done" }],
        },
      ],
      permissionMatrix: [
        { role: "Member", entity: "Task", actions: ["create"] },
      ],
      validationRules: ["Title is required"],
      moneyRules: ["N/A"],
      sideEffects: ["Completing records a timestamp"],
    },
  };
  const revisedPrd = { ...validPrd, goals: ["Track tasks", "Subtasks"] };

  beforeEach(() => {
    vi.mocked(listSpecs).mockResolvedValue([
      { id: "spec-prd", type: "PRD", content: validPrd },
      { id: "spec-design", type: "DESIGN", content: { markdown: "x" } },
    ] as never);
    vi.mocked(revisePrd).mockResolvedValue({
      summary: "Added subtasks.",
      prd: revisedPrd,
    } as never);
    vi.mocked(createSpec).mockImplementation(
      async (_project, type) => ({ id: `new-${type}`, type }) as never,
    );
  });

  it("revises the PRD, regenerates data model and app structure, and returns them", async () => {
    const out = await RealSpecGenerator.revise(projectId, "Add subtasks", ctx);

    expect(revisePrd).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPrd: validPrd,
        instruction: "Add subtasks",
        projectId,
      }),
    );
    expect(generateDataModel).toHaveBeenCalledWith(
      expect.objectContaining({ prd: "PRD as text" }),
    );
    expect(out.summary).toBe("Added subtasks.");
    expect(out.specs.map((s) => s.type)).toEqual([
      "PRD",
      "DATA_MODEL",
      "APP_STRUCTURE",
    ]);
    expect(createSpec).toHaveBeenCalledWith(projectId, "PRD", revisedPrd, ctx);
  });

  it("leaves the design spec alone", async () => {
    await RealSpecGenerator.revise(projectId, "Add subtasks", ctx);

    expect(generateDesign).not.toHaveBeenCalled();
    expect(vi.mocked(createSpec).mock.calls.map((c) => c[1])).not.toContain(
      "DESIGN",
    );
  });

  it("does no regeneration and writes nothing when the PRD comes back unchanged", async () => {
    vi.mocked(revisePrd).mockResolvedValue({
      summary: "That isn't a change to the requirements.",
      prd: structuredClone(validPrd),
    } as never);

    const out = await RealSpecGenerator.revise(projectId, "hello", ctx);

    expect(out).toEqual({
      summary: "That isn't a change to the requirements.",
      specs: [],
    });
    expect(generateDataModel).not.toHaveBeenCalled();
    expect(generateAppStructure).not.toHaveBeenCalled();
    expect(createSpec).not.toHaveBeenCalled();
  });

  it("writes nothing if a downstream step fails, so specs never disagree", async () => {
    vi.mocked(generateAppStructure).mockRejectedValue(new Error("boom"));

    await expect(
      RealSpecGenerator.revise(projectId, "Add subtasks", ctx),
    ).rejects.toThrow("boom");

    expect(createSpec).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when there is no PRD yet", async () => {
    vi.mocked(listSpecs).mockResolvedValue([] as never);

    await expect(
      RealSpecGenerator.revise(projectId, "Add subtasks", ctx),
    ).rejects.toThrow(NotFoundError);
    expect(revisePrd).not.toHaveBeenCalled();
  });

  it("publishes progress for the revise step", async () => {
    await RealSpecGenerator.revise(projectId, "Add subtasks", ctx);

    const steps = publish.mock.calls.map((c) => `${c[1].step}:${c[1].status}`);
    expect(steps).toEqual([
      "revise-prd:started",
      "revise-prd:completed",
      "data-model:started",
      "data-model:completed",
      "app-structure:started",
      "app-structure:completed",
    ]);
  });
});

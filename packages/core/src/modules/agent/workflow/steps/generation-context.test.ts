import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../../lib/context";

vi.mock("../../../spec/spec.repository", () => ({
  findApprovedSpecsByTypes: vi.fn(),
}));
vi.mock("../../../usage/usage.service", () => ({ emit: vi.fn() }));

import { findApprovedSpecsByTypes } from "../../../spec/spec.repository";
import { loadApprovedSpecs, renderSpecsForPrompt } from "./generation-context";

const ctx: RequestContext = { userId: "u1", orgId: "o1" };

describe("loadApprovedSpecs (AI-6)", () => {
  beforeEach(() => vi.clearAllMocks());

  const prd = {
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
  const appStructure = {
    pages: [{ route: "/tasks", personas: ["User"] }],
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

  it("loads and validates all four approved specs", async () => {
    vi.mocked(findApprovedSpecsByTypes).mockResolvedValue([
      { type: "PRD", content: prd },
      { type: "DESIGN", content: { markdown: "# Design" } },
      {
        type: "DATA_MODEL",
        content: { schema: "model Task { id String @id }" },
      },
      { type: "APP_STRUCTURE", content: appStructure },
    ] as never);

    const specs = await loadApprovedSpecs("p1", ctx);

    expect(specs.prd.overview).toBe("o");
    expect(specs.design).toBe("# Design");
    expect(specs.dataModel).toBe("model Task { id String @id }");
    expect(specs.appStructure.pages).toHaveLength(1);
  });

  it("throws naming every missing spec type", async () => {
    vi.mocked(findApprovedSpecsByTypes).mockResolvedValue([
      { type: "PRD", content: prd },
    ] as never);

    await expect(loadApprovedSpecs("p1", ctx)).rejects.toThrow(
      /DESIGN.*DATA_MODEL.*APP_STRUCTURE/,
    );
  });
});

describe("renderSpecsForPrompt (AI-6)", () => {
  it("includes every spec section", () => {
    const text = renderSpecsForPrompt({
      prd: {
        overview: "Overview text",
        goals: ["Goal 1"],
        nonGoals: [],
        personas: [{ name: "User", description: "d" }],
        userStories: [{ persona: "User", story: "does a thing" }],
        assumptions: [],
        businessRules: {
          invariants: ["always true"],
          stateMachine: [{ entity: "Task", states: ["open"], transitions: [] }],
          permissionMatrix: [
            { role: "User", entity: "Task", actions: ["create"] },
          ],
          validationRules: ["must validate"],
          moneyRules: ["N/A"],
          sideEffects: ["none"],
        },
      },
      design: "# Design doc",
      dataModel: "model Task { id String @id }",
      appStructure: {
        pages: [{ route: "/tasks", personas: ["User"] }],
        endpoints: [
          {
            method: "POST",
            path: "/api/tasks",
            requestType: "CreateTaskRequest",
            responseType: "CreateTaskResponse",
          },
        ],
        components: [{ name: "TaskList", responsibility: "renders tasks" }],
      },
    });

    expect(text).toContain("Overview text");
    expect(text).toContain("# Design doc");
    expect(text).toContain("model Task { id String @id }");
    expect(text).toContain("POST /api/tasks");
    expect(text).toContain("CreateTaskRequest");
    expect(text).toContain("TaskList");
  });
});

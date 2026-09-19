import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../../lib/context";
import { MockProvider } from "../../llm/providers/mock";
import type { LLMCompleteResult, LLMProvider } from "../../llm/provider";
import { generateAppStructure } from "./generate-app-structure";

vi.mock("../../../usage/usage.service", () => ({ emit: vi.fn() }));

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };

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

const VALID_STRUCTURE = JSON.stringify({
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
  ],
  components: [
    { name: "TaskList", responsibility: "Renders the user's tasks" },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateAppStructure (AI-5)", () => {
  it("returns pages, endpoints, and components with every endpoint typed both ways", async () => {
    const provider = providerReturning(VALID_STRUCTURE);

    const structure = await generateAppStructure({
      prd: "# Overview\nA todo app.",
      dataModel: "model Task { id String @id }",
      ctx,
      provider,
    });

    expect(structure.pages.length).toBeGreaterThan(0);
    expect(structure.components.length).toBeGreaterThan(0);
    for (const endpoint of structure.endpoints) {
      expect(endpoint.requestType.length).toBeGreaterThan(0);
      expect(endpoint.responseType.length).toBeGreaterThan(0);
    }
  });

  it("runs against the mock provider out of the box, still with both types on every endpoint", async () => {
    const structure = await generateAppStructure({
      prd: "# Overview\nA todo app.",
      dataModel: "model Task { id String @id }",
      ctx,
      provider: MockProvider,
    });

    expect(structure.endpoints.length).toBeGreaterThan(0);
    for (const endpoint of structure.endpoints) {
      expect(typeof endpoint.requestType).toBe("string");
      expect(endpoint.requestType.length).toBeGreaterThan(0);
      expect(typeof endpoint.responseType).toBe("string");
      expect(endpoint.responseType.length).toBeGreaterThan(0);
    }
  });
});

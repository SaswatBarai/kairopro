import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Spec as SpecRow } from "@kairopro/db";

vi.mock("../../platform/db/client", () => ({ db: {} }));

vi.mock("./spec.repository", () => ({
  createSpecVersion: vi.fn(),
  findLatestSpecByType: vi.fn(),
}));

import { createSpecVersion, findLatestSpecByType } from "./spec.repository";
import { createNextVersion } from "./versioning";

function specRow(overrides: Partial<SpecRow> = {}): SpecRow {
  return {
    id: "spec-1",
    projectId: "prj-1",
    type: "PRD",
    version: 1,
    status: "DRAFT",
    content: {},
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("versioning (BE-6)", () => {
  it("creates version 1 when no prior version exists", async () => {
    vi.mocked(findLatestSpecByType).mockResolvedValueOnce(null);
    vi.mocked(createSpecVersion).mockResolvedValueOnce(specRow({ version: 1 }));

    await createNextVersion("prj-1", "PRD", { a: 1 });

    expect(createSpecVersion).toHaveBeenCalledWith(
      expect.objectContaining({ version: 1, status: "DRAFT" }),
    );
  });

  it("revise creates version n+1 — version n is never mutated", async () => {
    vi.mocked(findLatestSpecByType).mockResolvedValueOnce(
      specRow({ version: 3, status: "APPROVED" }),
    );
    vi.mocked(createSpecVersion).mockResolvedValueOnce(
      specRow({ version: 4, status: "DRAFT" }),
    );

    const result = await createNextVersion("prj-1", "PRD", { a: 2 });

    expect(createSpecVersion).toHaveBeenCalledWith(
      expect.objectContaining({ version: 4 }),
    );
    expect(result.version).toBe(4);
    // The mutation surface is create-only — no update call touches version 3.
  });
});

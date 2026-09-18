import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../lib/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors";

vi.mock("../../platform/db/client", () => ({ db: {} }));

vi.mock("./spec.repository", () => ({
  findLatestSpecsByProject: vi.fn(),
  findSpecWithProject: vi.fn(),
  updateSpecStatus: vi.fn(),
}));

vi.mock("./versioning", () => ({
  createNextVersion: vi.fn(),
}));

vi.mock("./staleness", () => ({
  staleDownstream: vi.fn(),
}));

vi.mock("../org/access", () => ({
  ownerOf: vi.fn(),
}));

import {
  findLatestSpecsByProject,
  findSpecWithProject,
  updateSpecStatus,
} from "./spec.repository";
import { createNextVersion } from "./versioning";
import { staleDownstream } from "./staleness";
import { ownerOf } from "../org/access";
import {
  approveSpec,
  createSpec,
  getSpec,
  listSpecs,
  rejectSpec,
  reviseSpec,
} from "./spec.service";

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };

function specRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "spec-1",
    projectId: "prj-1",
    type: "PRD",
    version: 1,
    status: "DRAFT",
    content: { a: 1 },
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("spec.service access (BE-6)", () => {
  it("listSpecs 404s for a project the caller cannot access", async () => {
    vi.mocked(ownerOf).mockResolvedValueOnce(null);
    await expect(listSpecs("prj-1", ctx)).rejects.toThrow(NotFoundError);
    expect(findLatestSpecsByProject).not.toHaveBeenCalled();
  });

  it("getSpec 404s when the spec's project belongs to a foreign org", async () => {
    vi.mocked(findSpecWithProject).mockResolvedValueOnce(specRow() as never);
    vi.mocked(ownerOf).mockResolvedValueOnce(null);
    await expect(getSpec("spec-1", ctx)).rejects.toThrow(NotFoundError);
  });

  it("createSpec rejects non-object content", async () => {
    vi.mocked(ownerOf).mockResolvedValueOnce({ id: "prj-1" } as never);
    await expect(
      createSpec("prj-1", "PRD", "not an object", ctx),
    ).rejects.toThrow(ValidationError);
  });
});

describe("spec.service approve (BE-6)", () => {
  it("approves a DRAFT spec and stales downstream approved specs", async () => {
    vi.mocked(findSpecWithProject).mockResolvedValueOnce(
      specRow({ status: "DRAFT" }) as never,
    );
    vi.mocked(ownerOf).mockResolvedValueOnce({ id: "prj-1" } as never);
    vi.mocked(updateSpecStatus).mockResolvedValueOnce(
      specRow({ status: "APPROVED" }) as never,
    );

    const result = await approveSpec("spec-1", ctx);

    expect(updateSpecStatus).toHaveBeenCalledWith("spec-1", "APPROVED");
    expect(staleDownstream).toHaveBeenCalledWith("prj-1", "PRD");
    expect(result.status).toBe("APPROVED");
  });

  it("approving a STALE spec returns a conflict", async () => {
    vi.mocked(findSpecWithProject).mockResolvedValueOnce(
      specRow({ status: "STALE" }) as never,
    );
    vi.mocked(ownerOf).mockResolvedValueOnce({ id: "prj-1" } as never);

    await expect(approveSpec("spec-1", ctx)).rejects.toThrow(ConflictError);
    expect(updateSpecStatus).not.toHaveBeenCalled();
    expect(staleDownstream).not.toHaveBeenCalled();
  });

  it("approving an already-APPROVED spec returns a conflict", async () => {
    vi.mocked(findSpecWithProject).mockResolvedValueOnce(
      specRow({ status: "APPROVED" }) as never,
    );
    vi.mocked(ownerOf).mockResolvedValueOnce({ id: "prj-1" } as never);

    await expect(approveSpec("spec-1", ctx)).rejects.toThrow(ConflictError);
  });
});

describe("spec.service revise/reject (BE-6)", () => {
  it("revise creates a new version and leaves the current row alone", async () => {
    vi.mocked(findSpecWithProject).mockResolvedValueOnce(
      specRow({ status: "STALE", version: 2 }) as never,
    );
    vi.mocked(ownerOf).mockResolvedValueOnce({ id: "prj-1" } as never);
    vi.mocked(createNextVersion).mockResolvedValueOnce(
      specRow({ status: "DRAFT", version: 3 }) as never,
    );

    const result = await reviseSpec("spec-1", { a: 2 }, ctx);

    expect(createNextVersion).toHaveBeenCalledWith(
      "prj-1",
      "PRD",
      { a: 2 },
      "DRAFT",
    );
    expect(updateSpecStatus).not.toHaveBeenCalled();
    expect(result.version).toBe(3);
  });

  it("reject moves a PENDING_APPROVAL spec to REJECTED", async () => {
    vi.mocked(findSpecWithProject).mockResolvedValueOnce(
      specRow({ status: "PENDING_APPROVAL" }) as never,
    );
    vi.mocked(ownerOf).mockResolvedValueOnce({ id: "prj-1" } as never);
    vi.mocked(updateSpecStatus).mockResolvedValueOnce(
      specRow({ status: "REJECTED" }) as never,
    );

    const result = await rejectSpec("spec-1", ctx);

    expect(updateSpecStatus).toHaveBeenCalledWith("spec-1", "REJECTED");
    expect(result.status).toBe("REJECTED");
  });

  it("reject refuses an already-approved spec", async () => {
    vi.mocked(findSpecWithProject).mockResolvedValueOnce(
      specRow({ status: "APPROVED" }) as never,
    );
    vi.mocked(ownerOf).mockResolvedValueOnce({ id: "prj-1" } as never);

    await expect(rejectSpec("spec-1", ctx)).rejects.toThrow(ConflictError);
  });
});

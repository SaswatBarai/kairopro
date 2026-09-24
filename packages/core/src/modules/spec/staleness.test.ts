import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpecType } from "@kairopro/db";

vi.mock("../../platform/db/client", () => ({ db: {} }));

vi.mock("./spec.repository", () => ({
  findApprovedSpecsByTypes: vi.fn(),
  updateSpecStatus: vi.fn(),
}));

import { findApprovedSpecsByTypes, updateSpecStatus } from "./spec.repository";
import { SPEC_ORDER, downstreamTypes, staleDownstream } from "./staleness";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("staleness (BE-6)", () => {
  it.each<[SpecType, SpecType[]]>([
    ["PRD", ["DESIGN", "DATA_MODEL", "APP_STRUCTURE"]],
    // Nothing is derived from the design system, so approving it stales nothing.
    ["DESIGN", []],
    ["DATA_MODEL", ["APP_STRUCTURE"]],
    ["APP_STRUCTURE", []],
  ])("downstream of %s is %j", (type, expected) => {
    expect(downstreamTypes(type)).toEqual(expected);
  });

  it("approving PRD stales every downstream approved spec", async () => {
    vi.mocked(findApprovedSpecsByTypes).mockResolvedValueOnce([
      { id: "design-1" } as never,
      { id: "dm-1" } as never,
      { id: "as-1" } as never,
    ]);

    await staleDownstream("prj-1", "PRD");

    expect(findApprovedSpecsByTypes).toHaveBeenCalledWith("prj-1", [
      "DESIGN",
      "DATA_MODEL",
      "APP_STRUCTURE",
    ]);
    expect(updateSpecStatus).toHaveBeenCalledTimes(3);
    expect(updateSpecStatus).toHaveBeenCalledWith("design-1", "STALE");
    expect(updateSpecStatus).toHaveBeenCalledWith("dm-1", "STALE");
    expect(updateSpecStatus).toHaveBeenCalledWith("as-1", "STALE");
  });

  it("approving the design stales neither the data model nor the app structure", async () => {
    vi.mocked(findApprovedSpecsByTypes).mockResolvedValueOnce([]);

    await staleDownstream("prj-1", "DESIGN");

    expect(findApprovedSpecsByTypes).toHaveBeenCalledWith("prj-1", []);
    expect(updateSpecStatus).not.toHaveBeenCalled();
  });

  it("approving APP_STRUCTURE stales nothing", async () => {
    vi.mocked(findApprovedSpecsByTypes).mockResolvedValueOnce([]);

    await staleDownstream("prj-1", "APP_STRUCTURE");

    expect(findApprovedSpecsByTypes).toHaveBeenCalledWith("prj-1", []);
    expect(updateSpecStatus).not.toHaveBeenCalled();
  });

  it("SPEC_ORDER is the pipeline generation order", () => {
    expect(SPEC_ORDER).toEqual([
      "PRD",
      "DESIGN",
      "DATA_MODEL",
      "APP_STRUCTURE",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { versionKeys } from "./versions";

describe("versionKeys", () => {
  it("generates correct query key hierarchy for a project", () => {
    const keys = versionKeys("proj-123");
    expect(keys.all).toEqual(["projects", "proj-123", "versions"]);
    expect(keys.list()).toEqual(["projects", "proj-123", "versions", "list"]);
    expect(keys.diff("ver-456")).toEqual([
      "projects",
      "proj-123",
      "versions",
      "ver-456",
      "diff",
    ]);
  });
});

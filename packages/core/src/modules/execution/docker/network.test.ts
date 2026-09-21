import { describe, expect, it } from "vitest";
import { findOrphans, type ManagedResource } from "./network";

describe("findOrphans (BE-9)", () => {
  it("returns nothing when every managed resource has a known project", () => {
    const managed: ManagedResource[] = [
      { id: "1", name: "kairopro-app-a", projectId: "a" },
      { id: "2", name: "kairopro-db-b", projectId: "b" },
    ];

    expect(findOrphans(managed, ["a", "b"])).toEqual([]);
  });

  it("flags a managed resource whose project id has no matching record", () => {
    const managed: ManagedResource[] = [
      { id: "1", name: "kairopro-app-a", projectId: "a" },
      { id: "2", name: "kairopro-app-deleted", projectId: "deleted" },
    ];

    expect(findOrphans(managed, ["a"])).toEqual([
      { id: "2", name: "kairopro-app-deleted", projectId: "deleted" },
    ]);
  });

  it("returns everything when there are no known projects", () => {
    const managed: ManagedResource[] = [{ id: "1", name: "x", projectId: "a" }];

    expect(findOrphans(managed, [])).toEqual(managed);
  });

  it("returns nothing for an empty managed list", () => {
    expect(findOrphans([], ["a", "b"])).toEqual([]);
  });
});

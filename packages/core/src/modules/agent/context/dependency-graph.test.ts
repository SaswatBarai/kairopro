import { describe, expect, it } from "vitest";
import type { FileIndex } from "./file-index";
import { buildDependencyGraph } from "./dependency-graph";

const fixture: FileIndex = [
  {
    path: "src/models/user.ts",
    exports: ["User"],
    imports: [],
    tags: ["schema"],
  },
  {
    path: "src/api/users.ts",
    exports: ["listUsers"],
    imports: ["../models/user"],
    tags: ["route"],
  },
  {
    path: "src/components/UserForm.tsx",
    exports: ["UserForm"],
    imports: ["../models/user", "react"],
    tags: ["component"],
  },
  {
    path: "src/components/Footer.tsx",
    exports: ["Footer"],
    imports: [],
    tags: ["component"],
  },
];

describe("buildDependencyGraph (AI-4)", () => {
  it("resolves reverse imports for a known fixture project", () => {
    const graph = buildDependencyGraph(fixture);

    expect(graph.dependents("src/models/user.ts")).toEqual([
      "src/api/users.ts",
      "src/components/UserForm.tsx",
    ]);
  });

  it("returns nothing for a file no one imports", () => {
    const graph = buildDependencyGraph(fixture);
    expect(graph.dependents("src/components/Footer.tsx")).toEqual([]);
  });

  it("never resolves a bare (non-relative) specifier", () => {
    const graph = buildDependencyGraph(fixture);
    // "react" is imported but isn't a workspace file — it must not create
    // a phantom dependent edge onto anything.
    expect(graph.dependents("react")).toEqual([]);
  });

  it("resolves an extensionless relative specifier against a known file", () => {
    const index: FileIndex = [
      { path: "src/lib/util.ts", exports: [], imports: [], tags: ["file"] },
      {
        path: "src/lib/caller.ts",
        exports: [],
        imports: ["./util"],
        tags: ["file"],
      },
    ];
    const graph = buildDependencyGraph(index);
    expect(graph.dependents("src/lib/util.ts")).toEqual(["src/lib/caller.ts"]);
  });
});

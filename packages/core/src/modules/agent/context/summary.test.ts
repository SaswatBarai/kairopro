import { describe, expect, it } from "vitest";
import type { FileIndex } from "./file-index";
import { renderSummary, summarize } from "./summary";

const fixture: FileIndex = [
  { path: "prisma/schema.prisma", exports: [], imports: [], tags: ["schema"] },
  {
    path: "src/api/users.ts",
    exports: ["listUsers"],
    imports: [],
    tags: ["route"],
  },
  {
    path: "src/app/dashboard/page.tsx",
    exports: [],
    imports: [],
    tags: ["page"],
  },
  {
    path: "src/components/Footer.tsx",
    exports: ["Footer"],
    imports: [],
    tags: ["component"],
  },
];

describe("summarize (AI-4)", () => {
  it("matches the fixture", () => {
    expect(summarize(fixture)).toEqual({
      fileCount: 4,
      models: ["prisma/schema.prisma"],
      pages: ["src/app/dashboard/page.tsx"],
      routes: ["src/api/users.ts"],
      conventions: [],
    });
  });

  it("reports none-detected sections for an index with no matches", () => {
    expect(summarize([])).toEqual({
      fileCount: 0,
      models: [],
      pages: [],
      routes: [],
      conventions: [],
    });
  });
});

describe("renderSummary (AI-4)", () => {
  it("matches the fixture text", () => {
    expect(renderSummary(summarize(fixture))).toBe(
      [
        "Project has 4 indexed file(s).",
        "Models: prisma/schema.prisma",
        "Pages: src/app/dashboard/page.tsx",
        "Routes: src/api/users.ts",
      ].join("\n"),
    );
  });

  it("says none detected for an empty project", () => {
    expect(renderSummary(summarize([]))).toBe(
      [
        "Project has 0 indexed file(s).",
        "Models: none detected",
        "Pages: none detected",
        "Routes: none detected",
      ].join("\n"),
    );
  });
});

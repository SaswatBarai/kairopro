import { describe, expect, it } from "vitest";
import {
  basename,
  buildFileTree,
  defaultFileToOpen,
  dirname,
  fileBadge,
  fileTone,
  folderPaths,
  languageOf,
} from "./file-tree";

describe("buildFileTree", () => {
  it("nests paths into folders, folders before files, alphabetically", () => {
    const tree = buildFileTree([
      "package.json",
      "src/lib/util.ts",
      "src/app/page.tsx",
      "src/app/api/tasks/route.ts",
      "README.md",
      "prisma/schema.prisma",
    ]);

    expect(tree.map((n) => n.name)).toEqual([
      "prisma",
      "src",
      "package.json",
      "README.md",
    ]);
    const src = tree.find((n) => n.name === "src")!;
    expect(src.children!.map((n) => n.name)).toEqual(["app", "lib"]);
    const app = src.children!.find((n) => n.name === "app")!;
    expect(app.children!.map((n) => `${n.kind}:${n.name}`)).toEqual([
      "folder:api",
      "file:page.tsx",
    ]);
  });

  it("gives every node its full path", () => {
    const tree = buildFileTree(["src/app/page.tsx"]);
    expect(tree[0]!.path).toBe("src");
    expect(tree[0]!.children![0]!.path).toBe("src/app");
    expect(tree[0]!.children![0]!.children![0]!.path).toBe("src/app/page.tsx");
  });

  it("handles no files", () => {
    expect(buildFileTree([])).toEqual([]);
  });

  it("does not duplicate a folder shared by several files", () => {
    const tree = buildFileTree(["a/x.ts", "a/y.ts", "a/b/z.ts"]);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.children!.map((n) => n.name)).toEqual([
      "b",
      "x.ts",
      "y.ts",
    ]);
  });
});

describe("folderPaths", () => {
  it("lists containing folders down to a depth", () => {
    expect(
      folderPaths(["src/app/api/tasks/route.ts", "prisma/schema.prisma"], 2),
    ).toEqual(["prisma", "src", "src/app"]);
  });
});

describe("paths and names", () => {
  it("splits a path", () => {
    expect(basename("src/app/page.tsx")).toBe("page.tsx");
    expect(dirname("src/app/page.tsx")).toBe("src/app");
    expect(dirname("package.json")).toBe("");
  });

  it("colours and badges files by what they are", () => {
    expect(fileTone("src/app/api/tasks/route.ts")).toBe("bg-brand-cyan");
    expect(fileTone("src/__tests__/unit/a.test.ts")).toBe("bg-brand-green");
    expect(fileTone("src/app/page.tsx")).toBe("bg-brand-purple-light");
    expect(fileTone("prisma/schema.prisma")).toBe("bg-amber-400");
    expect(fileBadge("src/app/api/tasks/route.ts")).toBe("API");
    expect(fileBadge("prisma/schema.prisma")).toBe("DB");
    expect(fileBadge("src/app/page.tsx")).toBeNull();
  });

  it("names the language from the extension", () => {
    expect(languageOf("a.ts")).toBe("TypeScript");
    expect(languageOf("a.tsx")).toBe("TypeScript React");
    expect(languageOf("schema.prisma")).toBe("Prisma");
    expect(languageOf("Makefile")).toBe("Plain text");
  });
});

describe("defaultFileToOpen", () => {
  it("prefers the home page, then falls back", () => {
    expect(defaultFileToOpen(["package.json", "src/app/page.tsx"])).toBe(
      "src/app/page.tsx",
    );
    expect(defaultFileToOpen(["z.ts", "package.json"])).toBe("package.json");
    expect(defaultFileToOpen(["z.ts", "a.ts"])).toBe("z.ts");
    expect(defaultFileToOpen([])).toBeNull();
  });
});

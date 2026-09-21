import { describe, expect, it } from "vitest";
import { loadTemplate, renderConventions } from "./template";

describe("loadTemplate (AI-6)", () => {
  it("loads the real nextjs-shadcn template.json via the templates package", () => {
    const manifest = loadTemplate("nextjs-shadcn");

    expect(manifest.id).toBe("nextjs-shadcn");
    expect(manifest.conventions.importAlias).toBe("@/");
    expect(manifest.conventions.contractsPath).toBe("src/lib/contracts.ts");
  });

  it("throws a typed error for an unknown template id", () => {
    expect(() => loadTemplate("does-not-exist")).toThrow(/Unknown template/);
  });
});

describe("renderConventions (AI-6)", () => {
  it("renders every convention field, sourced from the manifest, not hardcoded", () => {
    const text = renderConventions({
      id: "custom",
      stack: "Custom Stack",
      description: "",
      conventions: {
        importAlias: "~/",
        srcDir: "app",
        apiRoutesDir: "app/routes",
        pagesDir: "app/pages",
        componentsDir: "app/ui",
        libDir: "app/lib",
        contractsPath: "app/lib/contracts.ts",
        authConfigPath: "app/lib/auth.ts",
        prismaSchemaPath: "db/schema.prisma",
        styling: "css-modules",
        validation: "yup",
        orm: "drizzle",
        auth: "lucia",
        testFramework: "jest",
      },
    });

    expect(text).toContain("Custom Stack");
    expect(text).toContain("Import alias: ~/");
    expect(text).toContain("ORM: drizzle");
    expect(text).toContain("Auth library: lucia");
  });
});

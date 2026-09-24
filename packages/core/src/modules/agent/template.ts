import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ValidationError } from "../../lib/errors";

/**
 * Template loading (Phase 16 / AI-6) — deliberately free of any db/LLM
 * import. Every generation step needs this; `generation-context.ts` (specs
 * loading, prompt rendering) is a separate module specifically so that
 * pulling in template conventions alone — as `scaffold.ts` does — never
 * drags in the database client.
 */

export interface TemplateConventions {
  importAlias: string;
  srcDir: string;
  apiRoutesDir: string;
  pagesDir: string;
  componentsDir: string;
  libDir: string;
  contractsPath: string;
  /** UI primitives the skeleton ships in `componentsDir/ui` — the only ones
   * that exist; a page importing any other fails the type check. */
  uiComponents?: string[];
  authConfigPath: string;
  /** The Prisma client singleton the template ships — routes import
   * `{ prisma }` from it and never construct a client themselves. */
  prismaClientPath: string;
  prismaSchemaPath: string;
  styling: string;
  validation: string;
  orm: string;
  auth: string;
  testFramework: string;
}

export interface TemplateManifest {
  id: string;
  stack: string;
  description: string;
  conventions: TemplateConventions;
}

const manifestCache = new Map<string, TemplateManifest>();

/** Reads and caches `<templateId>/template.json` via `@kairopro/templates`'s
 * own `exports` map — the one place a template id resolves to a real path,
 * so an unknown id fails here rather than downstream as `undefined`. */
export function loadTemplate(templateId: string): TemplateManifest {
  const cached = manifestCache.get(templateId);
  if (cached) return cached;

  const manifestPath = resolveTemplateJson(templateId);
  const manifest = JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as TemplateManifest;
  manifestCache.set(templateId, manifest);
  return manifest;
}

/** The conventions block every generation prompt embeds verbatim — this is
 * the entire mechanism by which "conventions come from the template, not
 * from prompt text": the prompt file only has a `{{conventions}}` hole,
 * and this is the one function that fills it. */
export function renderConventions(manifest: TemplateManifest): string {
  const { conventions } = manifest;
  return [
    `Stack: ${manifest.stack}`,
    `Import alias: ${conventions.importAlias}`,
    `Source directory: ${conventions.srcDir}`,
    `API routes directory: ${conventions.apiRoutesDir}`,
    `Pages directory: ${conventions.pagesDir}`,
    `Components directory: ${conventions.componentsDir}`,
    `Lib directory: ${conventions.libDir}`,
    `Shared contracts module: ${conventions.contractsPath}`,
    `Auth configuration module: ${conventions.authConfigPath}`,
    `Prisma client module: ${conventions.prismaClientPath} (already provided — import { prisma } from it; never construct a PrismaClient anywhere else)`,
    `Prisma schema: ${conventions.prismaSchemaPath}`,
    ...(conventions.uiComponents?.length
      ? [
          `UI components (already provided — import from "${conventions.importAlias}components/ui/<name>"; nothing else exists there, so build anything more from plain Tailwind elements): ${conventions.uiComponents.join(", ")}`,
          `Class-name helper: import { cn } from "${conventions.importAlias}lib/utils"`,
        ]
      : []),
    `Styling: ${conventions.styling}`,
    `Validation library: ${conventions.validation}`,
    `ORM: ${conventions.orm}`,
    `Auth library: ${conventions.auth}`,
    `Test framework: ${conventions.testFramework}`,
  ].join("\n");
}

/** `packages/templates`'s real directory — walked from this file's own
 * location via `import.meta.url`, never through `require.resolve`'s
 * package-`exports`-map lookup. Next's Turbopack dev server preserves
 * `import.meta.url` as the true original source path (the documented,
 * supported pattern for build-time asset resolution) but virtualizes
 * `require.resolve` for workspace packages into a logical id like
 * `[project]/packages/...` — not a real filesystem path — which every
 * plain-`vitest`-run test here was blind to, since those never go through
 * Turbopack at all. */
const TEMPLATES_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../templates",
);

function resolveTemplateJson(templateId: string): string {
  const manifestPath = join(TEMPLATES_ROOT, templateId, "template.json");
  if (!existsSync(manifestPath)) {
    throw new ValidationError({
      message: `Unknown template id "${templateId}"`,
    });
  }
  return manifestPath;
}

/** Resolves a template's skeleton directory via the same `exports` map. */
export function resolveSkeletonDir(templateId: string): string {
  return join(dirname(resolveTemplateJson(templateId)), "skeleton");
}

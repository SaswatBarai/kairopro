import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
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
  authConfigPath: string;
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
    `Prisma schema: ${conventions.prismaSchemaPath}`,
    `Styling: ${conventions.styling}`,
    `Validation library: ${conventions.validation}`,
    `ORM: ${conventions.orm}`,
    `Auth library: ${conventions.auth}`,
    `Test framework: ${conventions.testFramework}`,
  ].join("\n");
}

function resolveTemplateJson(templateId: string): string {
  const require = createRequire(import.meta.url);
  try {
    return require.resolve(`@kairopro/templates/${templateId}/template.json`);
  } catch (cause) {
    throw new ValidationError({
      message: `Unknown template id "${templateId}"`,
      cause,
    });
  }
}

/** Resolves a template's skeleton directory via the same `exports` map. */
export function resolveSkeletonDir(templateId: string): string {
  return join(dirname(resolveTemplateJson(templateId)), "skeleton");
}

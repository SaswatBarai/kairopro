import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RequestContext } from "../../../../lib/context";
import { getLLMProvider } from "../../llm";
import type { LLMProvider } from "../../llm/provider";
import { modelFor } from "../../llm/router";
import { completeWithValidator, stripCodeFence } from "../../llm/structured";
import { renderPrompt } from "../../prompts/loader";

/**
 * generate-data-model workflow step (Phase 11 / AI-5). Output is raw
 * Prisma DSL (`model`/`enum` blocks only), not JSON — validated against
 * the real, locally-installed Prisma CLI (same CLI-shelling pattern
 * `design.service.ts` uses for `designmd`), not a heuristic. "Parses"
 * means parses.
 *
 * Invoked directly via its resolved script path, never `npx prisma` — npx
 * does registry/version resolution even for an already-installed package,
 * which is both slow (seconds, not milliseconds) and can pick the wrong
 * version outside a project directory. `prisma` is a direct devDependency
 * of this package specifically so this resolves deterministically.
 */

export interface GenerateDataModelInput {
  prd: string;
  ctx: RequestContext;
  projectId?: string;
  provider?: LLMProvider;
}

// A synthetic datasource/generator — validation-only, never written
// anywhere real. Prisma 7 no longer allows an inline `url` in the
// datasource block (it moved to prisma.config.ts); `validate` only checks
// schema/relation correctness and never connects, so omitting it is fine.
const SCHEMA_HEADER = `datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

`;

/** `prisma`'s package directory — walked from this file's own location via
 * `import.meta.url`, never through `require.resolve`'s package-resolution
 * algorithm. Next's Turbopack dev server preserves `import.meta.url` as
 * the true original source path but virtualizes `require.resolve` into a
 * logical id like `[project]/node_modules/...` — not a real filesystem
 * path — which every plain-`vitest`-run test here was blind to, since
 * those never go through Turbopack at all (same bug, same fix, as
 * `template.ts`'s `resolveTemplateJson`). `prisma` is a direct
 * devDependency of this package specifically so this resolves
 * deterministically, via a fixed relative path. */
async function resolvePrismaBin(): Promise<string> {
  const pkgPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../../node_modules/prisma/package.json",
  );
  const pkg = JSON.parse(await readFile(pkgPath, "utf8")) as {
    bin: string | Record<string, string>;
  };
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.prisma;
  if (!bin) {
    throw new Error("Could not resolve the prisma CLI's bin entry");
  }
  return join(dirname(pkgPath), bin);
}

/** Validates raw Prisma DSL (`model`/`enum` blocks, no datasource/generator)
 * against the real Prisma CLI. Exported for reuse by Phase 16's `schema`
 * step, which re-validates the already-approved data model spec before
 * writing it into a real project — the same check, a different caller. */
export async function validatePrismaSchema(content: string): Promise<string> {
  // Fences are already stripped for completions arriving via
  // `completeWithValidator`; this repeats it because Phase 16's `schema`
  // step calls this validator directly with stored spec content, which
  // never passed through that path. Idempotent either way.
  const trimmed = stripCodeFence(content);
  if (!trimmed) {
    throw new Error("Data model must not be empty");
  }

  const prismaBin = await resolvePrismaBin();
  const dir = await mkdtemp(join(tmpdir(), "kairopro-prisma-validate-"));
  const schemaPath = join(dir, "schema.prisma");
  try {
    await writeFile(schemaPath, SCHEMA_HEADER + trimmed, "utf8");
    await new Promise<void>((resolve, reject) => {
      execFile(
        process.execPath,
        [prismaBin, "validate", `--schema=${schemaPath}`],
        { timeout: 30_000 },
        (err, _stdout, stderr) => {
          if (err) {
            reject(new Error(stderr || err.message));
            return;
          }
          resolve();
        },
      );
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  return trimmed;
}

export async function generateDataModel(
  input: GenerateDataModelInput,
): Promise<string> {
  const provider = input.provider ?? getLLMProvider();
  const model = modelFor("data-model");

  return completeWithValidator({
    provider,
    model,
    messages: [
      { role: "system", content: renderPrompt("system") },
      { role: "user", content: renderPrompt("data-model", { prd: input.prd }) },
    ],
    ctx: input.ctx,
    refs: { projectId: input.projectId },
    validate: validatePrismaSchema,
  });
}

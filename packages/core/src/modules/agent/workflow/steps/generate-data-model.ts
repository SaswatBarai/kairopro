import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { RequestContext } from "../../../../lib/context";
import { getLLMProvider } from "../../llm";
import type { LLMProvider } from "../../llm/provider";
import { modelFor } from "../../llm/router";
import { completeWithValidator } from "../../llm/structured";
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

function resolvePrismaBin(): string {
  const require = createRequire(import.meta.url);
  const pkgPath = require.resolve("prisma/package.json");
  const pkg = require(pkgPath) as { bin: string | Record<string, string> };
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.prisma;
  if (!bin) {
    throw new Error("Could not resolve the prisma CLI's bin entry");
  }
  return join(dirname(pkgPath), bin);
}

async function validatePrismaSchema(content: string): Promise<string> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Data model must not be empty");
  }

  const prismaBin = resolvePrismaBin();
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

import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { LLMProvider } from "@kairopro/core";
import { resetDb, testDb } from "./helpers";

/**
 * Integration Gates I-5 (AI-6 ↔ BE-9) and I-6 (AI-7 ↔ BE-10), combined
 * since both are proven by the same wired pipeline: scaffold → backend
 * phase → frontend phase, each file repaired by the real fix loop and
 * gated by the real degradation policy.
 *
 * What this proves for real: a fake LLM provider's output is written to a
 * real git workspace, type-checked by the *real* `tsc` binary (not a
 * mock), and — when that fails — repaired by the real fix loop using
 * tsc's own diagnostics, or halted by the real never-degradable policy.
 * `InternalError` rows are real Postgres rows.
 *
 * What this does NOT prove (deliberately, and said so rather than faked):
 * the "real container, `next build`, preview URL responds 200" half of
 * Gate I-5's checklist. That needs a real Docker daemon, a real `npm
 * install` inside a scaffolded Next.js project, and a real (non-mock) LLM
 * call — none of which belong in an automated, offline test suite. It
 * remains a manual/production verification step.
 *
 * The workspace lives *inside* the monorepo tree (not `os.tmpdir()`) on
 * purpose: `runTypecheck` shells out to plain `npx tsc`, and npx only
 * resolves the already-installed `typescript` binary without a network
 * fetch when the cwd's ancestor chain includes this repo's root
 * `node_modules` — verified empirically before relying on it here.
 */

const workspaceRoot = await fs.mkdtemp(join(process.cwd(), "tmp-gate-i5-i6-"));
process.env.KAIROPRO_WORKSPACE_ROOT = workspaceRoot;

const core = await import("@kairopro/core");
const prisma = testDb();

beforeEach(async () => {
  await resetDb(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
  await fs.rm(workspaceRoot, { recursive: true, force: true });
});

let seedCounter = 0;
async function seedProject() {
  const email = `ada-gate56-${++seedCounter}@lovelace.dev`;
  const user = await prisma.user.create({
    data: { name: "Ada Lovelace", email },
  });
  const org = await prisma.organization.create({
    data: {
      name: "kairo-gate56",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  const ctx = { userId: user.id, orgId: org.id };
  const project = await core.createProject({ name: "GateApp" }, ctx);
  const workspacePath = join(workspaceRoot, project.id);
  return { ctx, project, workspacePath };
}

/** A minimal, dependency-free tsconfig — proves the fix loop's real tsc
 * integration without needing `npm install` for a full Next.js skeleton
 * (that's `scaffold.test.ts`'s job, already covered separately). */
async function writeMinimalTsconfig(workspacePath: string): Promise<void> {
  const require = createRequire(import.meta.url);
  const zodDir = join(require.resolve("zod/package.json"), "..");
  await fs.writeFile(
    join(workspacePath, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        types: [],
        paths: { zod: [zodDir] },
      },
      include: ["*.ts"],
    }),
    "utf8",
  );
}

/** Responds with each of `contents` in order, then repeats the last one
 * forever — every call in these tests happens strictly sequentially (one
 * unit generated at a time), so a plain ordered queue is enough; no
 * content-sniffing routing needed. */
function fakeProvider(...contents: string[]): LLMProvider {
  let call = 0;
  return {
    name: "fake",
    complete: async () => {
      const content = contents[Math.min(call, contents.length - 1)]!;
      call += 1;
      return {
        content,
        usage: { inputTokens: 1, outputTokens: 1 },
        stopReason: "end_turn" as const,
      };
    },
    stream: async () => {
      throw new Error("not used");
    },
  };
}

describe("Integration Gates I-5 / I-6: code generation is real, and recovery is real", () => {
  it("a broken generation attempt is repaired by the real fix loop using real tsc diagnostics, and the result genuinely type-checks", async () => {
    const { ctx, project, workspacePath } = await seedProject();
    await core.getWorkspaceStore().allocate(project.id);
    await writeMinimalTsconfig(workspacePath);

    const runtime = core.getContainerRuntime();

    // Call order is strictly sequential: (1) contracts generation,
    // (2) greeting.ts's first (broken) attempt, (3) greeting.ts's fix
    // retry, corrected using real tsc's own diagnostic.
    const provider = fakeProvider(
      [
        'import { z } from "zod";',
        "export interface Greeting { text: string; }",
        "export const GreetingSchema = z.object({ text: z.string() });",
      ].join("\n"),
      // Broken: references an undefined identifier.
      'import { GreetingSchema } from "./contracts";\nexport const bad = doesNotExist(GreetingSchema);',
      [
        'import { GreetingSchema, type Greeting } from "./contracts";',
        "export function makeGreeting(text: string): Greeting {",
        "  return GreetingSchema.parse({ text });",
        "}",
      ].join("\n"),
    );

    const contractsResult = await core.freezeContracts({
      projectId: project.id,
      ctx,
      workspace: core.getWorkspaceStore(),
      runtime,
      containerId: "irrelevant-for-stub",
      cwd: workspacePath,
      conventions: "Import alias: @/",
      specs: "App Structure spec: Greeting { text }",
      contractsPath: "contracts.ts",
      provider,
    });
    expect(contractsResult).toEqual({
      path: "contracts.ts",
      fixAttempts: 1,
      level: "full",
      omitted: false,
    });

    const fileResult = await core.generateFile({
      path: "greeting.ts",
      task: "Write a makeGreeting helper.",
      conventions: "Import alias: @/",
      specs: "App Structure spec: Greeting { text }",
      concern: "other",
      projectId: project.id,
      ctx,
      workspace: core.getWorkspaceStore(),
      runtime,
      containerId: "irrelevant-for-stub",
      cwd: workspacePath,
      provider,
    });

    // 1 broken attempt + 1 fix attempt = 2, and it recovered rather than
    // being omitted or halted — the real fix loop closed the loop.
    expect(fileResult).toEqual({
      path: "greeting.ts",
      fixAttempts: 2,
      level: "full",
      omitted: false,
    });

    const written = await fs.readFile(
      join(workspacePath, "greeting.ts"),
      "utf8",
    );
    expect(written).toContain("makeGreeting");
    expect(written).not.toContain("doesNotExist");
  }, 30_000);

  it("a never-degradable concern that can never be fixed halts (not silently simplified), and every attempt is logged with full context", async () => {
    const { ctx, project, workspacePath } = await seedProject();
    await core.getWorkspaceStore().allocate(project.id);
    await writeMinimalTsconfig(workspacePath);

    const runtime = core.getContainerRuntime();
    // Never produces valid TypeScript — freeze-contracts is tagged
    // "data-invariants" internally, which never degrades.
    const provider = fakeProvider("this is not valid typescript at all !!!");

    await expect(
      core.freezeContracts({
        projectId: project.id,
        ctx,
        workspace: core.getWorkspaceStore(),
        runtime,
        containerId: "irrelevant-for-stub",
        cwd: workspacePath,
        conventions: "Import alias: @/",
        specs: "App Structure spec: Greeting { text }",
        contractsPath: "contracts.ts",
        provider,
      }),
    ).rejects.toBeInstanceOf(core.CodeGenerationError);

    const errors = await prisma.internalError.findMany({
      where: { step: "contracts.ts" },
    });
    expect(errors.length).toBeGreaterThan(0);
    const halt = errors.find((e) => e.resolution === "halted:never-degradable");
    expect(halt).toBeDefined();
    expect(halt!.resolved).toBe(false);
    // Full context: step, type, message, and (file/attempt/approach) in detail.
    expect(halt!.step).toBe("contracts.ts");
    expect(halt!.message.length).toBeGreaterThan(0);
    const detail = halt!.detail as {
      file: unknown;
      attempt: number;
      approach: number;
    };
    expect(detail.attempt).toBeGreaterThan(0);
    expect(detail.approach).toBeGreaterThan(0);

    // Never walked the degradation ladder — only ever the "full" level.
    const degraded = errors.find((e) => e.resolution?.startsWith("degraded:"));
    expect(degraded).toBeUndefined();
  }, 30_000);
});

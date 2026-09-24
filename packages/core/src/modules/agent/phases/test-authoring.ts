import { isReusableFile } from "../workflow/resume";
import type { RequestContext } from "../../../lib/context";
import type { ContainerRuntime } from "../../../platform/container/runtime";
import type { WorkspaceStore } from "../../../platform/workspace/store";
import { getLLMProvider } from "../llm";
import type { LLMProvider } from "../llm/provider";
import { modelFor } from "../llm/router";
import { completeWithValidator } from "../llm/structured";
import { renderPrompt } from "../prompts/loader";
import type { DegradationLevel } from "../recovery/degradation";
import { runFixLoop, type AttemptOutcome } from "../recovery/fix-loop";
import type { ConcernCategory } from "../recovery/rules";
import { renderConventions, type TemplateManifest } from "../template";
import type {
  AppStructureEndpoint,
  AppStructurePage,
} from "../validators/app-structure";
import type { PrdPermissionRule } from "../validators/prd";
import { runTypecheck, type TypecheckError } from "../validators/typecheck";
import type { CodeStreamEvent } from "../workflow/steps/generate-code";
import { pageFilePath } from "./frontend";
import { routeFilePath } from "./backend";
import {
  renderSpecsForPrompt,
  type ApprovedSpecs,
} from "../workflow/steps/generation-context";

/**
 * Test-authoring phase (Phase 18 / AI-8) — "the one true agent boundary in
 * the system." Tests written from code verify the implementation is
 * self-consistent; tests written from the spec verify it does what was
 * asked. This phase only ever sees the approved specs and the frozen
 * contracts — never a generated route, page, or component's actual code —
 * which is the entire mechanism behind that independence, not a policy
 * enforced after the fact.
 */

export const TEST_LEVELS = ["unit", "integration", "e2e"] as const;
export type TestLevel = (typeof TEST_LEVELS)[number];

export type TestSource =
  | "invariant"
  | "state-machine"
  | "permission"
  | "validation"
  | "money"
  | "primary-flow";

export interface TestCase {
  level: TestLevel;
  path: string;
  description: string;
  task: string;
  source: TestSource;
  concern: ConcernCategory;
  /** The generated file this test exercises, when derivable from the spec
   * (e.g. an endpoint's route file) — `run-tests.ts` reads this back out of
   * the written test file's header comment to route a failing assertion to
   * the right implementation to repair. `null` when no single file applies
   * (e.g. a cross-cutting invariant). */
  implementationPath: string | null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Best-effort: the endpoint whose path names `entity` and whose method
 * matches `action`'s verb — the same "does this path segment name this
 * entity" heuristic `phases/backend.ts` uses for concern tagging, applied
 * here to point a permission test at the route it's actually about. `null`
 * when nothing matches closely enough to be worth guessing. */
function findEndpointFor(
  entity: string,
  action: string,
  endpoints: AppStructureEndpoint[],
): AppStructureEndpoint | null {
  const entityLower = entity.toLowerCase();
  const actionLower = action.toLowerCase();
  const methodForAction = /create|add/.test(actionLower)
    ? "POST"
    : /delete|remove/.test(actionLower)
      ? "DELETE"
      : /update|edit|change/.test(actionLower)
        ? "PUT"
        : /view|read|list|get/.test(actionLower)
          ? "GET"
          : null;

  return (
    endpoints.find((e) => {
      const segments = e.path
        .toLowerCase()
        .split(/[/:_-]+/)
        .filter(Boolean);
      const touchesEntity = segments.some(
        (s) => s.includes(entityLower) || entityLower.includes(s),
      );
      if (!touchesEntity) return false;
      return methodForAction ? e.method === methodForAction : true;
    }) ?? null
  );
}

function invariantTestCases(invariants: string[]): TestCase[] {
  return invariants.map((invariant, i) => ({
    level: "unit",
    path: `src/__tests__/unit/invariant-${i}-${slugify(invariant)}.test.ts`,
    description: `Invariant: ${invariant}`,
    source: "invariant",
    concern: "data-invariants",
    implementationPath: null,
    task: [
      `Write a unit test asserting this invariant always holds:`,
      `"${invariant}"`,
      "Exercise it through the frozen contracts' types/schemas and pure",
      "logic only — assert the invariant, not any particular function name.",
    ].join("\n"),
  }));
}

function stateMachineTestCases(
  stateMachine: {
    entity: string;
    states: string[];
    transitions: { from: string; to: string; trigger?: string }[];
  }[],
): TestCase[] {
  return stateMachine.map((machine, i) => ({
    level: "unit",
    path: `src/__tests__/unit/state-machine-${i}-${slugify(machine.entity)}.test.ts`,
    description: `State machine: ${machine.entity}`,
    source: "state-machine",
    concern: "data-invariants",
    implementationPath: null,
    task: [
      `Write a unit test for ${machine.entity}'s state machine.`,
      `States: ${machine.states.join(", ")}.`,
      machine.transitions.length > 0
        ? `Legal transitions: ${machine.transitions.map((t) => `${t.from} → ${t.to}${t.trigger ? ` (${t.trigger})` : ""}`).join("; ")}.`
        : "No transitions were declared — assert the entity never leaves its initial state.",
      "Assert every legal transition succeeds and at least one illegal",
      "transition (a state pair not listed above) is rejected.",
    ].join("\n"),
  }));
}

function validationTestCases(validationRules: string[]): TestCase[] {
  return validationRules.map((rule, i) => ({
    level: "unit",
    path: `src/__tests__/unit/validation-${i}-${slugify(rule)}.test.ts`,
    description: `Validation rule: ${rule}`,
    source: "validation",
    concern: "data-invariants",
    implementationPath: null,
    task: [
      `Write a unit test asserting this validation rule is enforced:`,
      `"${rule}"`,
      "Test both a value that satisfies it and one that violates it —",
      "the violating case must be rejected, not merely produce a",
      "different result.",
    ].join("\n"),
  }));
}

function moneyTestCases(moneyRules: string[]): TestCase[] {
  return moneyRules
    .filter((rule) => !/^n\/a\b/i.test(rule.trim()))
    .map((rule, i) => ({
      level: "unit",
      path: `src/__tests__/unit/money-${i}-${slugify(rule)}.test.ts`,
      description: `Money rule: ${rule}`,
      source: "money",
      concern: "money-handling",
      implementationPath: null,
      task: [
        `Write a unit test asserting this money-handling rule holds:`,
        `"${rule}"`,
        "Use exact decimal/integer comparisons — never an approximate",
        "(epsilon-tolerant) comparison for a monetary value.",
      ].join("\n"),
    }));
}

/** One negative test per (role, entity, action) triple in the permission
 * matrix — "at least one negative test per role-action pair" (Phase 18
 * exit criteria). The negative actor is "not `role`", not a second named
 * role: the spec only guarantees `role` is allowed, so anyone else being
 * forbidden is the one assertion every matrix row supports regardless of
 * how many roles the app actually has. */
function permissionTestCases(
  permissionMatrix: PrdPermissionRule[],
  endpoints: AppStructureEndpoint[],
  template: TemplateManifest,
): TestCase[] {
  const cases: TestCase[] = [];
  for (const rule of permissionMatrix) {
    for (const action of rule.actions) {
      const endpoint = findEndpointFor(rule.entity, action, endpoints);
      cases.push({
        level: "integration",
        path: `src/__tests__/integration/permission-${slugify(rule.role)}-${slugify(rule.entity)}-${slugify(action)}.test.ts`,
        description: `Negative permission: not-${rule.role} cannot ${action} ${rule.entity}`,
        source: "permission",
        concern: "authorization",
        implementationPath: endpoint
          ? routeFilePath(template, endpoint.path)
          : null,
        task: [
          `Write an integration test against a real (test) database`,
          `asserting that a caller who is NOT "${rule.role}" is forbidden`,
          `from performing "${action}" on ${rule.entity}${endpoint ? ` via ${endpoint.method} ${endpoint.path}` : ""}.`,
          "The assertion must check an explicit rejection — a 401/403",
          "response, a thrown authorization error, or unchanged persisted",
          'state — never merely "the call did not throw."',
        ].join("\n"),
      });
    }
  }
  return cases;
}

function primaryFlowTestCases(
  pages: AppStructurePage[],
  template: TemplateManifest,
): TestCase[] {
  return pages.map((page, i) => ({
    level: "e2e",
    path: `e2e/primary-flow-${i}-${slugify(page.route)}.spec.ts`,
    description: `Primary flow: ${page.route}`,
    source: "primary-flow",
    concern: "other",
    implementationPath: pageFilePath(template, page.route),
    task: [
      `Write an end-to-end test of the primary flow at ${page.route},`,
      `for these personas: ${page.personas.join(", ")}.`,
      "Exercise the flow the way a real user would: navigate to the",
      "page, perform the primary action it exists for, and assert the",
      "user-visible outcome the specs describe — not an implementation",
      "detail like a CSS class or a specific DOM structure.",
    ].join("\n"),
  }));
}

/** Derives every test case from the approved specs — pure, no LLM call, no
 * I/O. "Business rules → tests": invariants, the state machine, and the
 * permission matrix each produce assertions on their own, deterministically,
 * before a single word is generated. */
export function deriveTestCases(
  specs: ApprovedSpecs,
  template: TemplateManifest,
): TestCase[] {
  const { businessRules } = specs.prd;
  return [
    ...invariantTestCases(businessRules.invariants),
    ...stateMachineTestCases(businessRules.stateMachine),
    ...validationTestCases(businessRules.validationRules),
    ...moneyTestCases(businessRules.moneyRules),
    ...permissionTestCases(
      businessRules.permissionMatrix,
      specs.appStructure.endpoints,
      template,
    ),
    ...primaryFlowTestCases(specs.appStructure.pages, template),
  ];
}

const IMPLEMENTATION_HEADER_RE = /^\/\/ @implementation:\s*(.+)$/m;

/** Reads a generated test file's `@implementation:` header back out —
 * `workflow/steps/run-tests.ts` uses this to route a failing assertion to
 * the file it should repair. */
export function readImplementationHeader(content: string): string | null {
  const match = content.match(IMPLEMENTATION_HEADER_RE);
  return match ? match[1]!.trim() : null;
}

function taskWithHeader(testCase: TestCase): string {
  if (!testCase.implementationPath) return testCase.task;
  return [
    `Begin the file with exactly this comment as its first line (then a`,
    `blank line, then the test):`,
    `// @implementation: ${testCase.implementationPath}`,
    "",
    testCase.task,
  ].join("\n");
}

function stripFences(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  return (fenced ? fenced[1] : trimmed) ?? trimmed;
}

function validateNonEmpty(content: string): string {
  const stripped = stripFences(content);
  if (stripped.trim().length === 0) {
    throw new Error("Generated test content must not be empty");
  }
  return stripped;
}

function formatTypecheckErrors(errors: TypecheckError[]): string {
  return errors
    .map((e) => `${e.file}(${e.line},${e.column}): ${e.code}: ${e.message}`)
    .join("\n");
}

export interface GenerateTestFileInput {
  path: string;
  task: string;
  conventions: string;
  specs: string;
  contracts: string;
  /** Contents of `prisma/schema.prisma`, read by the caller — this module
   * never reads the workspace itself (AI-8). Empty when unavailable. */
  schema?: string;
  concern: ConcernCategory;
  projectId: string;
  buildId?: string | null;
  ctx: RequestContext;
  workspace: WorkspaceStore;
  runtime: ContainerRuntime;
  containerId: string;
  cwd?: string;
  provider?: LLMProvider;
  maxFixAttempts?: number;
  maxDistinctApproaches?: number;
  onDegrade?: (step: { level: DegradationLevel; message: string }) => void;
  /** Live view of the test file being written — see `CodeStreamEvent`. */
  onCode?: (event: CodeStreamEvent) => void;
}

export interface GenerateTestFileResult {
  path: string;
  fixAttempts: number;
  level: DegradationLevel;
  omitted: boolean;
}

/**
 * Generates one test file and type-checks it, repairing a compile failure
 * via the same Phase 17 fix loop `generate-code.ts` uses — with one
 * deliberate difference: the repair prompt **never calls `retrieve()`**
 * and never reads any other workspace file. A compile-fix here can only
 * see the specs, the contracts, and tsc's own diagnostic — the same
 * guarantee the first generation gets, so "never the implementation"
 * holds across every attempt, not just the first.
 */
export async function generateTestFile(
  input: GenerateTestFileInput,
): Promise<GenerateTestFileResult> {
  if (isReusableFile(input.path)) {
    const existing = await input.workspace
      .readFile(input.projectId, input.path)
      .catch(() => null);
    if (existing !== null) {
      input.onCode?.({ type: "done", omitted: false, content: existing });
      return {
        path: input.path,
        fixAttempts: 0,
        level: "full",
        omitted: false,
      };
    }
  }

  const provider = input.provider ?? getLLMProvider();
  const refs = { projectId: input.projectId, buildId: input.buildId };
  let lastWritten = "";
  const stream = input.onCode
    ? {
        onAttemptStart: () => input.onCode!({ type: "reset" }),
        onDelta: (text: string) => input.onCode!({ type: "delta", text }),
      }
    : undefined;

  async function attempt(step: {
    task: string;
    previousFailure?: string;
  }): Promise<AttemptOutcome<true>> {
    // The Prisma schema is the data model the specs already describe, not
    // implementation code — without it tests invent model names
    // (`prisma.team`) that the generated client doesn't have.
    const schema = input.schema ?? "";
    const schemaBlock = schema
      ? `\n\n# Database schema (the only Prisma models that exist)\n\n${schema}`
      : "";

    let raw: string;
    if (step.previousFailure === undefined) {
      raw = await completeWithValidator({
        provider,
        model: modelFor("test-gen"),
        messages: [
          { role: "system", content: renderPrompt("system") },
          {
            role: "user",
            content: renderPrompt("test-gen", {
              conventions: input.conventions,
              specs: input.specs,
              contracts: input.contracts,
              task: step.task + schemaBlock,
            }),
          },
        ],
        ctx: input.ctx,
        refs,
        validate: validateNonEmpty,
        stream,
      });
    } else {
      raw = await completeWithValidator({
        provider,
        model: modelFor("fix"),
        messages: [
          { role: "system", content: renderPrompt("system") },
          {
            role: "user",
            content: renderPrompt("fix", {
              path: input.path,
              conventions: input.conventions,
              error: step.previousFailure,
              // Deliberately not `retrieve()` output: a compile-repair of a
              // *test* file must never see implementation code. What it
              // needs to repair is the file itself, the frozen
              // contracts and the data model.
              context: [
                `--- ${input.path} (current) ---\n${lastWritten}`,
                `--- contracts ---\n${input.contracts}`,
                schema && `--- prisma/schema.prisma ---\n${schema}`,
              ]
                .filter(Boolean)
                .join("\n\n"),
            }),
          },
        ],
        ctx: input.ctx,
        refs,
        validate: validateNonEmpty,
        stream,
      });
    }

    await input.workspace.writeFile(input.projectId, input.path, raw);
    lastWritten = raw;

    const errors = await runTypecheck({
      runtime: input.runtime,
      containerId: input.containerId,
      cwd: input.cwd,
    });
    if (errors.length === 0) return { ok: true, value: true };
    return {
      ok: false,
      failure: {
        signal: { source: "typecheck", message: formatTypecheckErrors(errors) },
      },
    };
  }

  const result = await runFixLoop<true>({
    unitName: input.path,
    concern: input.concern,
    originalTask: input.task,
    buildId: input.buildId,
    maxAttemptsPerError: input.maxFixAttempts,
    maxDistinctApproaches: input.maxDistinctApproaches,
    attempt,
    onDegrade: input.onDegrade,
  });

  if (result.status === "succeeded") {
    input.onCode?.({ type: "done", omitted: false, content: lastWritten });
    return {
      path: input.path,
      fixAttempts: result.attempts,
      level: result.level,
      omitted: false,
    };
  }
  if (result.status === "omitted") {
    input.onCode?.({ type: "done", omitted: true });
    return {
      path: input.path,
      fixAttempts: result.attempts,
      level: "omit",
      omitted: true,
    };
  }
  throw new Error(`${input.path} could not be authored (${result.reason})`);
}

export interface RunTestAuthoringPhaseInput {
  projectId: string;
  buildId?: string | null;
  ctx: RequestContext;
  workspace: WorkspaceStore;
  runtime: ContainerRuntime;
  containerId: string;
  cwd?: string;
  template: TemplateManifest;
  specs: ApprovedSpecs;
  /** The frozen contracts module's own source — read once by the caller,
   * never by this phase, so there is one place to audit for "did this ever
   * touch the workspace beyond writing tests." */
  contractsContent: string;
  /** `prisma/schema.prisma`, read by the caller. */
  schemaContent?: string;
  provider?: LLMProvider;
  checkCancelled?: () => Promise<boolean>;
  onDegrade?: (
    unit: string,
    step: { level: DegradationLevel; message: string },
  ) => void;
  onCode?: (unit: string, event: CodeStreamEvent) => void;
}

export type TestAuthoringResult =
  | {
      status: "completed";
      testCases: TestCase[];
      filesGenerated: string[];
      omitted: string[];
    }
  | {
      status: "cancelled";
      testCases: TestCase[];
      filesGenerated: string[];
      omitted: string[];
    };

export async function runTestAuthoringPhase(
  input: RunTestAuthoringPhaseInput,
): Promise<TestAuthoringResult> {
  const conventions = renderConventions(input.template);
  const specsText = renderSpecsForPrompt(input.specs);
  const testCases = deriveTestCases(input.specs, input.template);
  const filesGenerated: string[] = [];
  const omitted: string[] = [];

  const cancelled = async () => {
    if (!input.checkCancelled) return false;
    return input.checkCancelled();
  };

  for (const testCase of testCases) {
    if (await cancelled()) {
      return { status: "cancelled", testCases, filesGenerated, omitted };
    }

    const result = await generateTestFile({
      path: testCase.path,
      task: taskWithHeader(testCase),
      conventions,
      specs: specsText,
      contracts: input.contractsContent,
      schema: input.schemaContent,
      concern: testCase.concern,
      projectId: input.projectId,
      buildId: input.buildId,
      ctx: input.ctx,
      workspace: input.workspace,
      runtime: input.runtime,
      containerId: input.containerId,
      cwd: input.cwd,
      provider: input.provider,
      onDegrade: input.onDegrade
        ? (step) => input.onDegrade!(testCase.path, step)
        : undefined,
      onCode: input.onCode
        ? (event) => input.onCode!(testCase.path, event)
        : undefined,
    });

    if (result.omitted) omitted.push(testCase.path);
    else filesGenerated.push(testCase.path);
  }

  return { status: "completed", testCases, filesGenerated, omitted };
}

# KairoPro — Backend & AI Implementation Plan

Phases BE-1 … BE-11 (Backend) and AI-1 … AI-9 (AI), organized by wave with the integration gates that bind them.

**The frontend has already shipped** — every visual surface (marketing, auth, dashboard, input flow, gates, build, workspace, deploy, settings) is ported from the Stitch exports in `designs/stitch/` and merged to `main`. It was built **visual-first, with mock data hardcoded inside components**: there are no MSW handlers, no contracts consumption, and no TanStack Query or Zustand usage yet — those dependencies are installed, and their planned homes (`apps/web/src/lib/{queries,sse,validation}`, `apps/web/src/app/api/**`) are `.gitkeep` placeholders.

**Consequence for this document:** integration is no longer "flip MSW off" — it is **rewiring each shipped page to real data as its backend phase lands**. The data-layer ownership rules in `IMPLEMENTATION_PLAN.md §2` (RSC initial render calls a service directly; TanStack Query for anything that refetches; SSE → Zustand ring buffers for streams) apply to that rewire. §0 maps each phase to the page it unlocks.

---

## How to read this document

Phases are grouped into four waves. Within each wave, phases appear **in the order they should be started**, which is not always numeric order — the critical path matters more than the numbering.

Every phase states: **Goal · Depends on · Deliverables · Exit criteria · Tests · Notes.**

Integration gates (`I-1` … `I-8`) appear inline, immediately after the phases they bind. **A wave is not complete until its gates pass.** Both tracks can have every unit test green while a gate fails — that is the specific failure this structure exists to catch.

---

## 0. Current repository state

_Audited 2026-09-13 — after the frontend build, before BE-1._

**Exists**

- `apps/web` — the complete UI: every screen from `designs/stitch/` ported to App Router pages, all with in-component mock data
- Workspace scaffolding matching the ownership table in §4: `packages/{contracts,db,core,templates}` with the full directory tree as `.gitkeep` placeholders — nothing populated
- Staged dependencies: `@kairopro/core` already carries dockerode, simple-git, pino, mammoth, pdf-parse, zod, vitest; `apps/web` carries zod, msw, TanStack Query, Zustand (all unused so far)
- Root scripts `db:generate` / `db:migrate` / `db:seed` / `db:studio` wired to `@kairopro/db` (Prisma 7, `prisma-client` generator, explicit output path)
- A `DATABASE_URL` for the planned dev stack in the root `.env`

**Does not exist yet**

- `packages/db/prisma/schema.prisma` — no schema, migration, seed, or generated client (BE-1)
- `packages/contracts` content (P0.4) — **prerequisite for every phase whose routes return contract-validated responses**; write it against the shapes the shipped pages already display
- Any test infrastructure (P0.3) — no Vitest config anywhere; lands alongside BE-1's integration tests
- The dev database itself — decision below; the compose file is created in BE-1
- `apps/web/src/app/theme.css` — `design:export` (P0.2) was never run; brand tokens are hand-written in `apps/web/src/app/globals.css`. Tracked in `IMPLEMENTATION_PLAN.md §9`

**Decisions locked since this document was written**

| Decision             | Choice                                                                                                                                                                                 | Consequence                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Dev/test database    | PostgreSQL 18 via a compose file in `docker/` (created in BE-1)                                                                                                                        | Migrations target it; integration tests use a throwaway database on the same engine                                                        |
| MSW layer (P0.5)     | **Skipped**                                                                                                                                                                            | The frontend shipped without it; pages rewire directly to real endpoints as phases land. MSW may return later for frontend unit tests only |
| Primary LLM provider | **Mock-first** — the `LLMProvider` interface and deterministic mock provider are built now; the concrete provider (Anthropic vs OpenAI) is chosen when real generation is first needed | Everything downstream proceeds offline; only `router.ts` model names and `providers/*.ts` wait                                             |
| F2 dashboard design  | Folded into the BE-4 rewire                                                                                                                                                            | The live dashboard is the F1 dual-state design; when BE-4 lands, rewire it to the F2 populated design with real data                       |

**Phase → shipped-page unlock map**

The UI components stay; only the data source changes. RSC pages call services directly for initial render; interactive concerns move to TanStack Query; streams move to SSE + Zustand.

| Phase       | Unlocks                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------- |
| BE-3        | `(auth)` pages go real · middleware guards `(dashboard)` · `/settings/profile` shows the real user |
| BE-4        | `/dashboard` (rewired to the F2 design) · project create/delete                                    |
| BE-5        | `/projects/new` input step persists (text + uploads)                                               |
| BE-6 + AI-5 | `/projects/new/{spec,data-model,app-structure}` gates read real, generated specs                   |
| BE-7        | `/settings/credentials` — real encrypted vault                                                     |
| BE-8        | Workspace history drawer (G3) — checkpoints become real git commits                                |
| BE-10       | `/projects/new/build` (E1/E2/E3) streams real logs · workspace terminal + preview                  |
| BE-11       | Deploy (H1), GitHub export (H2), deploy success (H3) go real                                       |
| AI-9        | Workspace agent panel (G2) drives real change requests                                             |

---

## 1. Why these tracks share one document

The AI track is blocked by backend work **eight times**:

| AI phase | Blocked by | Needs                                      |
| -------- | ---------- | ------------------------------------------ |
| AI-1     | BE-2       | `ContainerRuntime` seam, error types       |
| AI-2     | BE-2       | `WorkspaceStore`, `ContainerRuntime`       |
| AI-4     | BE-4       | A real workspace to index                  |
| AI-5     | BE-6       | Spec storage                               |
| AI-6     | BE-9       | Somewhere for generated code to run        |
| AI-7     | BE-10      | A build to fail, and a stream to report on |
| AI-8     | BE-9       | Tests must execute                         |
| AI-9     | BE-8       | Versioning for applied changes             |

Built sequentially, the AI track idles for most of the project. Built in parallel without coordination, the two halves integrate badly — mismatched interfaces, two owners for the same file, duplicated work.

So they are planned as **one work stream** with explicit seams, stubs, and gates.

---

## 2. The rule that shapes every backend phase

> **`packages/core` must not depend on `next`.**

No `cookies()`, `headers()`, `revalidatePath()`, or `NextResponse` inside a service. Routes read the session, construct a `RequestContext`, call one service method, and handle revalidation.

```ts
// apps/web/src/app/api/projects/route.ts  — transport only
export async function getRequestContext(): Promise<RequestContext> {
  const session = await getServerSession(authOptions); // ← web owns session access
  if (!session) throw new UnauthorizedError();
  return { userId: session.user.id, orgId: session.user.orgId };
}

export async function GET() {
  const ctx = await getRequestContext();
  const projects = await projectService.list(ctx);
  return Response.json(projects);
}

// packages/core/src/modules/project/project.service.ts  — domain only
export async function list(ctx: RequestContext): Promise<Project[]> {
  return repo.listByOrg(ctx.orgId);
}
```

**This is enforced structurally, not by lint.** `next` is not a dependency of `@kairopro/core`, so `import { cookies } from 'next/headers'` inside the package fails to resolve. An ESLint rule can be disabled with a comment; a missing dependency cannot. Do not add `next` to `core` "just for types".

**`RequestContext` is split across the boundary**, which is the clearest illustration of it:

```
packages/core/src/lib/context.ts      ← DEFINES the interface
apps/web/src/lib/request-context.ts   ← BUILDS it from the Next session
```

This is the difference between lifting a module into a background worker later and rewriting it.

---

## 3. The rule that shapes every AI phase

> **Determinism where possible; model only where necessary.**

Routing, file selection, validation, and verification are deterministic or use the cheapest model that works. Model intelligence is concentrated at generation.

> **Bounded everything.**

Iterations, retries, tokens, and wall-clock all have hard caps. An unbounded loop is a bug, not a feature.

---

## 4. Ownership — no two writers

Merge conflicts arise when two tracks edit the same file. The split is by directory.

| Path                                      | Owner       | Rule                                            |
| ----------------------------------------- | ----------- | ----------------------------------------------- |
| `packages/core/src/platform/**`           | **Backend** | AI imports interfaces; never modifies them      |
| `packages/core/src/modules/build/**`      | **Backend** | Build record, SSE, cancel flag, log persistence |
| `packages/core/src/modules/spec/**`       | **Backend** | Storage and versioning                          |
| `packages/core/src/modules/version/**`    | **Backend** | Git operations                                  |
| `packages/core/src/modules/execution/**`  | **Backend** | Containers, terminal, preview                   |
| `packages/core/src/modules/usage/**`      | **Backend** | Metering                                        |
| `packages/core/src/modules/credential/**` | **Backend** | Encryption and injection                        |
| `packages/core/src/modules/agent/**`      | **AI**      | Everything under this tree, entirely            |
| `packages/contracts/src/**`               | **Shared**  | Change requires agreement from both             |
| `packages/core/src/lib/errors.ts`         | **Shared**  | Change requires agreement from both             |
| `packages/templates/**`                   | **AI**      | Template and conventions                        |

### The one genuinely shared boundary: the build workflow

BE-10 owns `packages/core/src/modules/build/workflow.ts` — the step sequence, checkpoints, and cancel checks.
AI owns `packages/core/src/modules/agent/workflow/steps/**` — the implementations of those steps.

```ts
// packages/core/src/modules/build/workflow.ts  — OWNED BY BACKEND
const STEPS: WorkflowStep[] = [
  { name: "generate-data-model", run: generateDataModel }, // ← AI-owned impl
  { name: "generate-app-structure", run: generateAppStructure },
  { name: "generate-code", run: generateCode, canCancel: true },
  // ...
];

export async function run(buildId: string, ctx: BuildContext) {
  for (const step of STEPS) {
    if (await isCancelled(buildId)) return checkpoint(step); // backend
    const result = await step.run(ctx); // AI
    await logStep(buildId, step.name, result.status); // backend
  }
}
```

**Rule:** backend owns _when_ and _in what order_; AI owns _how_. Neither edits the other's side. `WorkflowStep` is the shared contract.

---

## 5. Stub-first integration

> **A seam is defined and stubbed before it is implemented.**

Every interface the AI track consumes gets a working stub in an early backend phase. The AI track develops against the stub and swaps to the real implementation when it lands — with no AI code changes, because the interface never changed.

| Seam                  | Stub arrives        | Real impl                                   | AI phase that consumes it |
| --------------------- | ------------------- | ------------------------------------------- | ------------------------- |
| `WorkspaceStore`      | BE-2                | BE-2 (local impl **is** the real one in V1) | AI-2                      |
| `ContainerRuntime`    | BE-2                | BE-9 (Docker)                               | AI-2, AI-6, AI-8          |
| `EventBus`            | BE-2                | BE-2                                        | AI-7                      |
| `UsageService.emit()` | BE-4 (logs a no-op) | BE-4 (writes rows)                          | AI-1                      |
| `SpecRepository`      | BE-6                | BE-6                                        | AI-5                      |
| `BuildLogWriter`      | BE-10               | BE-10                                       | AI-6, AI-7                |
| `InternalErrorWriter` | BE-1 (schema)       | AI-7                                        | AI-7                      |

**The `ContainerRuntime` stub is what lets AI-2 and AI-6 start before Docker exists:**

```ts
// packages/core/src/platform/container/stub.ts — BE-2
export const StubContainerRuntime: ContainerRuntime = {
  async exec(input) {
    // Runs on the host in a temp dir, no isolation.
    // DEVELOPMENT AND TESTS ONLY — never enabled in production.
  },
  async provision() {
    return { containerId: "stub", previewUrl: "" };
  },
  async health() {
    return { ready: true };
  },
  async stop() {},
  async destroy() {},
};
```

**The stub must be impossible to enable in production.** Guard on `NODE_ENV !== 'production'` and **fail startup** if it is selected in production. This is a security boundary, not a convenience — it is the one place generated code could run without isolation.

---

## 6. The critical path

```
BE-1  Data layer
  │
  ▼
BE-2  Platform seams  ◀──── HIGHEST LEVERAGE
  │                          unblocks AI-1 and AI-2
  ├──────────────────────────┐
  ▼                          ▼
BE-3  Auth + org          AI-1  LLM provider
  │                          │
  ▼                          ▼
BE-4  Project + usage     AI-2  Tools ──▶ AI-3  Prompts
  │                          │
  ▼                          ▼
BE-5  Input               AI-4  Context
  │                          │
  ▼                          ▼
BE-6  Spec  ────────────▶ AI-5  Spec generation
  │
  ▼
BE-7  Credential ───────▶ (AI continues on I-3 work)
  │
  ▼
BE-8  Version ──────────▶ (feeds AI-9)
  │
  ▼
BE-9  Execution ────────▶ AI-6  Code gen ──▶ AI-8  Test agent
  │
  ▼
BE-10 Build + SSE ──────▶ AI-7  Recovery
  │
  ▼
BE-11 Deploy ───────────▶ AI-9  Change requests
```

**Two conclusions.**

**BE-2 is the single highest-leverage phase in the project.** It is small — three interfaces, a crypto helper, a logger, a scheduler — and it unblocks two AI phases. Build it first.

**BE-9 and BE-10 are on the critical path for the second half.** AI-6, AI-7, and AI-8 all wait on execution and streaming. If the backend slips there, three AI phases stall simultaneously.

**A third, added by the current state (§0):** P0.4 (contracts) precedes BE-1 in practice. No route from BE-3 onward can return a contract-validated response until the schemas exist, and the rewire of each shipped page imports the same types. Write the contracts first, against the shapes the pages already display.

---

## 7. The 12 seams

Every interface that crosses the boundary.

| #   | Seam                  | Defined in                      | Consumed by                          | Contract                                                       |
| --- | --------------------- | ------------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| 1   | `WorkspaceStore`      | `platform/workspace`            | AI-2 file tools, AI-4 index          | Read/write/delete/list within a confined root                  |
| 2   | `ContainerRuntime`    | `platform/container`            | AI-2 exec, AI-6 build, AI-8 test run | `exec`, `execStream`, `provision`, `health`, `stop`, `destroy` |
| 3   | `EventBus`            | `platform/events`               | AI-7 emissions, BE-10 SSE            | Typed publish/subscribe per build channel                      |
| 4   | `UsageService.emit()` | `modules/usage`                 | AI-1 every model call                | `(kind, quantity, ctx) => void`, never throws                  |
| 5   | `SpecRepository`      | `modules/spec`                  | AI-5 generation output               | Versioned create/read; approval state                          |
| 6   | `BuildLogWriter`      | `modules/build/logs`            | AI-6, AI-7 progress                  | `(buildId, type, content)` → assigns `seq`                     |
| 7   | `InternalErrorWriter` | `modules/agent/recovery/logger` | AI-7                                 | Full failure context, never user-visible                       |
| 8   | `VersionService`      | `modules/version`               | AI-6, AI-9 commits                   | Commit with message; returns hash                              |
| 9   | `CredentialReader`    | `modules/credential`            | AI-6 env generation                  | Decrypted values, in memory only                               |
| 10  | `WorkflowStep`        | `modules/build/workflow`        | AI step implementations              | `{ name, run, canCancel?, checkpoint? }`                       |
| 11  | Contracts             | `lib/contracts`                 | Both, and the frontend               | Zod schemas; single source of types                            |
| 12  | Error types           | `lib/errors`                    | Both                                 | Typed errors mapped at the route boundary                      |

Each seam gets its TypeScript interface written **before** either side implements it. The interface is the coordination artifact — it is what lets two tracks work simultaneously without talking.

```ts
// packages/core/src/platform/container/runtime.ts — written in BE-2, implemented in BE-9
export interface ContainerRuntime {
  provision(
    input: ProvisionInput,
  ): Promise<{ containerId: string; previewUrl: string }>;
  exec(input: ExecInput): Promise<ExecResult>; // { exitCode, stdout, stderr }
  execStream(
    input: ExecInput,
    onLine: (line: string) => void,
  ): Promise<ExecResult>;
  health(containerId: string): Promise<{ ready: boolean; detail?: string }>;
  stop(containerId: string): Promise<void>; // preserves volumes
  destroy(containerId: string): Promise<void>; // removes volumes
}
```

---

# Wave 1 — Foundations and core

**Start order matters more in this wave than any other.**

```
BE-1 → BE-2 → ┌ AI-1 ──────────────────────┐
              ├ AI-3 ──────────────────┐   │
              └ BE-3 → BE-4 ──────┐    │   │
                                  ▼    ▼   ▼
                             AI-2 → AI-4  BE-5
```

Phases: **BE-1, BE-2, AI-1, AI-3, BE-3, BE-4, AI-2, AI-4, BE-5**

---

## BE-1: Data layer

**Goal:** the complete Prisma schema, migrations, and seed.

**Depends on:** P0.1

**Deliverables**

- `packages/db/prisma/schema.prisma` — all models:
  - Auth: `User`, `Account`, `Session`
  - Tenancy: `Organization`, `Membership`
  - Core: `Project`, `Input`, `Spec`, `Version`, `Credential`, `Build`, `BuildLog`
  - Ops: `UsageEvent`, `InternalError`
- `packages/db/prisma/migrations/` — initial migration
- `packages/db/prisma/seed.ts` — a demo user, org, and one project with specs and a completed build
- `packages/core/src/platform/db/client.ts` — Prisma client singleton with the global guard for hot reload
- `apps/web/src/lib/request-context.ts` — placeholder type (implemented in BE-3)

**Exit criteria**

- `prisma migrate dev` applies cleanly to an empty database
- `prisma migrate reset` then `prisma db seed` produces a usable demo state
- Every relation has an explicit `onDelete` behavior
- `Project` carries `templateId` (default `nextjs-shadcn`)
- `UsageEvent` exists with `type`, `quantity`, `projectId`, `buildId`, `createdAt`
- `InternalError` exists with `buildId`, `step`, `errorType`, `resolved`, `resolution`
- `BuildLog` has a per-build monotonic `seq` with a unique constraint on `(buildId, seq)`
- `Spec` has `@@unique([projectId, type, version])`
- Indexes on `Project(userId)`, `Project(status)`, `Spec(projectId, type)`, `Version(projectId)`, `BuildLog(buildId, seq)`, `InternalError(createdAt)`

**Tests**

- Integration against a throwaway database (Testcontainers or a compose test DB):
  - Creating a user with an org and membership succeeds
  - Deleting a project cascades to its specs, builds, versions, inputs, and credentials
  - The `BuildLog(buildId, seq)` constraint rejects a duplicate sequence
  - The `Spec(projectId, type, version)` constraint rejects a duplicate version
- Not tested: Prisma itself

**Notes**

- `UsageEvent` and `Membership` ship in V1 even though nothing user-visible depends on them. They are the two cheapest decisions that keep V2 billing and team accounts additive rather than a rewrite.
- `Organization` is introduced now with a single auto-created personal org. Invisible to the user in V1.
- Do not model per-user ownership as the access boundary. Access is via `Membership`.
- Dev database: create `docker/docker-compose.yml` (PostgreSQL 18, user `kairopro`, db `kairopro_dev`, port 5432) — the root `.env` already carries its `DATABASE_URL`. Integration tests use a throwaway database on the same engine, never the dev one.
- The seed should match the demo identity the shipped UI already displays as static mock: user `ada@lovelace.dev` (Ada Lovelace), personal org `kairo-core`, and a `DEPLOYED` project "TaskFlow" (`taskflow.kairopro.app`, template `nextjs-shadcn`) with approved specs and a completed build. The settings pages render this same identity today — the seed makes it real.

---

## BE-2: Platform seams ← highest leverage in the project

**Goal:** every piece of swappable infrastructure behind an interface, with a tested local implementation **and a stub** where the real implementation arrives later.

**Depends on:** BE-1

**Deliverables**

- `packages/core/src/platform/events/bus.ts` — `EventBus` interface; `LocalEventBus` (in-process, typed channels)
- `packages/core/src/platform/workspace/store.ts` — `WorkspaceStore` interface; `LocalWorkspaceStore` (filesystem under `KAIROPRO_WORKSPACE_ROOT`)
- `packages/core/src/platform/container/runtime.ts` — `ContainerRuntime` interface
- `packages/core/src/platform/container/stub.ts` — **the development stub, production-guarded**
- `packages/core/src/platform/crypto/encryption.ts` — AES-256-GCM with per-record IV and auth tag
- `packages/core/src/platform/logger/index.ts` — Pino with correlation fields (`projectId`, `buildId`, `step`)
- `packages/core/src/platform/jobs/scheduler.ts` — interval scheduler with registration, cancellation, overlap protection
- `packages/core/src/lib/errors.ts` — `NotFoundError`, `ValidationError`, `ConflictError`, `ProviderError`, `TimeoutError`

**Exit criteria**

- Each interface has exactly one implementation in V1; no consumer imports an implementation directly
- `LocalEventBus` delivers to subscribers and cleans up on unsubscribe
- `LocalWorkspaceStore` allocates, writes, reads, and deletes — **and refuses traversal outside the root**
- Crypto round-trips; a tampered ciphertext or auth tag fails rather than returning garbage
- Logger emits structured JSON with correlation fields present when provided
- Scheduler runs on interval, skips overlapping runs, stops cleanly
- Error types map to HTTP status **only** at the route boundary
- **`StubContainerRuntime` throws at startup if `NODE_ENV === 'production'`**

**Tests**

- `LocalEventBus` — publish/subscribe; unsubscribe stops delivery; a failing subscriber does not break others
- `LocalWorkspaceStore` — allocate/read/write/delete; **path traversal rejected** (`../`, absolute, symlink escape)
- `crypto` — round-trip; tampered ciphertext throws; tampered auth tag throws; distinct IVs per call
- `scheduler` — runs on interval; skips overlap; cancels
- `errors` — each type maps to the intended status
- **`stub` — selecting it in production throws at startup**

**Notes**

- **The path-traversal test is a security test.** Resolve the real path with symlinks followed, then assert containment. String prefix comparison fails on case-insensitive filesystems and symlinks.
- The scheduler must not `await` inside `setInterval` without overlap protection, or a slow job stacks.
- Writing all three interfaces here — even though only `WorkspaceStore` and `EventBus` have real implementations — is what unblocks AI-1 and AI-2 in parallel with BE-3.

---

## AI-1: LLM provider

**Goal:** a provider-agnostic interface for model calls with structured output and streaming.

**Depends on:** BE-2

**Deliverables**

- `packages/core/src/modules/agent/llm/provider.ts` — the `LLMProvider` interface
- `packages/core/src/modules/agent/llm/providers/anthropic.ts` — first concrete provider _(blocked: see Open Items)_
- `packages/core/src/modules/agent/llm/providers/mock.ts` — deterministic provider from fixtures
- `packages/core/src/modules/agent/llm/router.ts` — phase → model map
- `packages/core/src/modules/agent/llm/structured.ts` — Zod → JSON schema → validated response with bounded retry
- `packages/core/src/modules/agent/llm/tokens.ts` — token counting and per-call accounting
- `packages/core/src/modules/agent/llm/errors.ts` — typed provider errors

**Exit criteria**

- The interface exposes `complete()` and `stream()`; nothing provider-specific leaks through
- No module outside `providers/` imports a provider SDK
- A structured call returns a value satisfying its Zod schema, or throws a typed error
- A schema violation retries up to 3 times with the validation error fed back, then fails
- Retries are bounded and logged with the attempt number
- `router.ts` maps every phase name to a model and is the **only** place a model name appears
- Token usage from every call is reported to `UsageService.emit()` (the BE-4 stub until then)
- The mock provider produces schema-valid responses, so the whole test suite runs offline

**Tests**

- `structured` — valid response parses; invalid retries; retries exhaust and throw; the validation error is included in the retry prompt
- `router` — every workflow phase has a mapping; an unknown phase throws
- `mock` — returns a fixture matching the requested schema
- `tokens` — usage recorded on success, and on failure where the provider reports it
- **No test in this phase requires network access**

**Notes**

- **The mock provider is not a convenience — it is what makes this track testable.** Without it the AI suite is flaky and slow. Build it first inside this phase.
- The primary provider is still undecided (Open Items). Implement the interface and the mock fully; the concrete provider can land second without blocking anything downstream.
- Bounded retry is the pattern repeated throughout the AI track: three attempts, error fed back, then throw.

---

## AI-3: Prompt infrastructure

**Goal:** prompts as versioned, reviewable, testable artifacts.

**Depends on:** AI-1

**Deliverables**

- `packages/core/src/modules/agent/prompts/loader.ts` — load, cache, interpolate
- `packages/core/src/modules/agent/prompts/system.md`
- `packages/core/src/modules/agent/prompts/{pm-questions,prd,design,data-model,app-structure,code-gen,fix}.md`
- `tests/fixtures/prompts/` — one regression fixture per prompt

**Exit criteria**

- Prompts are loaded from disk, never inlined as string literals in TypeScript
- Interpolation is explicit and typed — a missing variable throws rather than rendering `undefined`
- Every prompt has a fixture: a known input renders deterministically and the output is asserted
- Prompts are diffable in review
- The system prompt is stable across phases; phase prompts compose on top
- **No prompt contains tech-stack conventions** — those come from `template.json` and the spec context

**Tests**

- `loader` — loads; a missing variable throws with the variable name
- Per-prompt fixtures — each renders to an asserted string for a fixed input
- **Convention-leak test** — assert no prompt file contains a hardcoded stack convention such as a literal import alias or component library name

**Notes**

- **The convention-leak test protects the second-template path.** If `shadcn` appears in a prompt string, adding a second UI library means editing prompts instead of adding a template. Conventions belong in context, injected at call time.
- Prompt fixtures are intentionally brittle. A prompt change that alters output should require updating a fixture — that is the point.
- Runs in parallel with BE-3. This phase has no backend dependency beyond AI-1.

---

## BE-3: Auth and organization

**Goal:** NextAuth with credentials and Google, plus the tenancy layer and access helpers.

**Depends on:** BE-1, BE-2

**Deliverables**

- `apps/web/src/lib/auth.ts` — NextAuth config: credentials provider (Argon2 or bcrypt), Google provider, JWT sessions
- `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- `packages/core/src/modules/org/org.service.ts` — create personal org on signup
- `packages/core/src/modules/org/membership.repository.ts`
- `packages/core/src/modules/org/access.ts` — `ownerOf(projectId, ctx)`, `canEdit(projectId, ctx)`, `assertMember(orgId, ctx)`
- `apps/web/src/lib/request-context.ts` — build `RequestContext` from the session
- `apps/web/src/app/api/auth/register/route.ts` — signup creating user + org + membership atomically
- `apps/web/src/middleware.ts` — protect `(dashboard)` routes

**Exit criteria**

- Registration creates a user, an organization, and an owner membership atomically — a partial failure rolls back all three
- Login works with credentials and with Google
- Session carries `userId` and the active `orgId`
- `ownerOf()` returns the project only when the caller has a membership in its org
- **Access failures return 404, not 403**, for projects the caller does not belong to
- Middleware redirects unauthenticated dashboard access to login, preserving the intended destination
- Passwords hashed with a per-user salt; plaintext never logged

**Tests**

- `register` — creates all three records; duplicate email returns a conflict; rollback leaves nothing behind
- `access` — returns the project for a member; null for a non-member; null for a nonexistent project
- `requestContext` — builds from a session; throws when unauthenticated
- Route-level — a foreign project id returns 404 with a body identical to a nonexistent id's

**Notes**

- **404 over 403 is deliberate.** A 403 confirms the project exists, which leaks information across tenants.
- Personal-org creation must be inside the same transaction as user creation, or a failure halfway leaves an orphan user who cannot create projects.
- `access.ts` is the seam that makes V2 team accounts additive. Every route goes through it rather than checking `userId` inline.

---

## BE-4: Project and usage

**Goal:** project CRUD, workspace allocation, and usage metering.

**Depends on:** BE-3

**Deliverables**

- `packages/core/src/modules/project/project.service.ts`, `project.repository.ts`
- `packages/core/src/modules/project/workspace.ts` — allocate workspace, `git init`, initial commit
- `packages/core/src/modules/version/git.service.ts` — commit helpers (BE-8 builds on this)
- `packages/core/src/modules/usage/usage.service.ts` — `emit(kind, quantity, ctx)`; `usage.repository.ts`
- `apps/web/src/app/api/projects/route.ts` — list, create
- `apps/web/src/app/api/projects/[id]/route.ts` — get, patch, delete

**Exit criteria**

- Creating a project allocates a workspace, initializes a git repository, and makes an initial commit
- The workspace path is stored on the project and **never derived from user input**
- Deleting a project removes the database row and the workspace directory
- Status transitions are validated — an illegal transition throws `ConflictError`
- **`emit()` never throws into the caller's path** (metering must not break a build)
- Listing returns only projects in the caller's org
- Routes return contract-validated responses

**Tests**

- `project.service` — create produces DB row + workspace + git repo; delete removes both; list scopes to org
- `workspace` — `git init` succeeds; a second init is idempotent; initial commit exists
- Status transitions — table-driven over legal and illegal pairs
- `usage.service` — emit writes a row; a repository failure is swallowed and logged, not thrown
- `usage` — every emission point (LLM call, build start, container-minute) is covered

**Notes**

- **Metering failure must never fail the caller.** Wrap `emit` so a metering outage degrades to a logged warning. This is the one place where swallowing an error is correct.
- The workspace path derives from the project **id**, never the name. Names are user input.
- **This is the seam that unblocks AI-4.** The agent's context builder needs a real workspace with real files to index.

---

## AI-2: Tool registry

**Goal:** the agent's interface to the workspace, with hard safety boundaries.

**Depends on:** AI-1, BE-2

**Deliverables**

- `packages/core/src/modules/agent/tools/registry.ts` — `Tool` interface, registration, scoped lookup by phase
- `packages/core/src/modules/agent/tools/file.tools.ts` — `read_file`, `write_file`, `edit_file`, `delete_file`, `list_files`
- `packages/core/src/modules/agent/tools/search.tools.ts` — `search_code`, `find_symbol`
- `packages/core/src/modules/agent/tools/exec.tools.ts` — `run_command`
- `packages/core/src/modules/agent/tools/index.ts` — default registry
- `packages/core/src/modules/agent/tools/safety.ts` — path confinement, command denylist, output truncation, timeouts
- `packages/core/src/modules/agent/tools/context.ts` — `ToolContext` binding a call to a project, workspace, and build

**Exit criteria**

- Every tool has a Zod input schema and rejects invalid input with a typed error
- **Every path is resolved and verified inside the workspace root; traversal, absolute paths, and symlink escapes are rejected**
- `write_file` creates parent directories; `edit_file` performs exact-match replacement and **fails loudly when the match is missing or ambiguous**
- `delete_file` refuses paths outside the workspace and refuses the workspace root
- `run_command` executes **inside the project container only**, honors a timeout, blocks a denylist of destructive patterns
- Tool output is truncated head-and-tail above a threshold, with truncation noted in the result
- Each tool emits a `tool_call` event for the build stream
- The registry returns only the tools allowed for a given phase

**Tests**

- `safety` — table-driven traversal: `../`, `..%2f`, absolute, symlink escape, valid sibling
- `file.tools` — write/read round-trip; edit replaces exactly one occurrence; edit fails on zero and on multiple
- `delete_file` — refuses the workspace root; refuses an escape
- `run_command` — timeout produces a typed error; denylisted patterns reject; normal command returns exit code and output
- `search.tools` — finds a known string; respects ignore patterns
- **Truncation** — a 10MB output is truncated with head and tail preserved
- Registry — a phase with a restricted tool set cannot retrieve a denied tool

**Notes**

- **The path-confinement test is the most important test in this document.** Resolve the real path with symlinks followed, then assert containment.
- `edit_file` failing loudly on an ambiguous match prevents silent corruption of the wrong occurrence.
- Runs against `StubContainerRuntime` until BE-9 lands. That is exactly what the stub is for.

---

## AI-4: Context builder

**Goal:** assemble the smallest set of files that lets the agent do the task correctly.

**Depends on:** AI-2, **BE-4**

**Deliverables**

- `packages/core/src/modules/agent/context/retrieve.ts` — **the single entry point for context**
- `packages/core/src/modules/agent/context/file-index.ts` — purpose, exports, imports, tags per file
- `packages/core/src/modules/agent/context/summary.ts` — project summary (models, pages, routes, conventions)
- `packages/core/src/modules/agent/context/dependency-graph.ts` — reverse imports and references
- `packages/core/src/modules/agent/context/budget.ts` — token budgeting and drop policy
- `packages/core/src/modules/agent/context/hydrate.ts` — full reads of the selected files

**Exit criteria**

- `retrieve(request, project, phase)` returns a deterministic file set for a given input
- Two-stage retrieval: cheap index-based selection, then full reads of only the selected files
- The dependency graph expands candidates — changing the schema pulls in API routes and forms that reference it
- A hard token budget is enforced; files beyond it are dropped by ascending relevance
- When files are dropped, the returned context **states that it is partial and lists what was omitted**
- The project summary is always included
- A `maxFiles` cap forces prioritization; exceeding it is logged
- The file index is generated on build and updated when files change

**Tests**

- `retrieve` — a schema-change request returns schema, API routes, and referencing forms
- `retrieve` — a purely cosmetic request does not return the schema
- `budget` — an oversized candidate set drops least-relevant first and reports the omission
- `dependency-graph` — reverse imports resolve for a known fixture project
- `summary` — generated summary matches a fixture
- Determinism — the same request twice returns an identical set

**Notes**

- **`retrieve()` is the seam that makes vector search a swap, not a refactor.** No caller outside this module may build context. Enforce it with the same ESLint boundary approach used for `modules/` → `next/*`.
- The `maxFiles` cap is a signal, not just a limit. When it binds, the request is probably too broad — surface that in the agent's reasoning rather than silently truncating.
- Build the file index deterministically. Do not use a model to describe files when static analysis can.

---

## BE-5: Input

**Goal:** accept text and files, store safely, extract text for the agent.

**Depends on:** BE-4

**Deliverables**

- `packages/core/src/modules/input/input.service.ts`, `input.repository.ts`
- `packages/core/src/modules/input/storage.ts` — write uploads under the uploads root
- `packages/core/src/modules/input/extract/` — `pdf.ts`, `docx.ts`, `text.ts`, `image.ts`
- `packages/contracts/src/upload.ts` — type allowlist, size and count limits (shared with frontend)
- `apps/web/src/app/api/projects/[id]/inputs/route.ts` — list, create (multipart)
- `apps/web/src/app/api/projects/[id]/inputs/[inputId]/route.ts` — delete

**Exit criteria**

- Only allowlisted types accepted: PDF, DOCX, TXT, MD, PNG, JPG, SVG
- Files over 10MB rejected **before** being written to disk
- A sixth file for one project rejected
- Stored filenames are generated, **never taken from the upload**
- Extraction returns text for PDF, DOCX, TXT, MD
- Images stored and passed through as vision input rather than extracted
- Extraction failure records the input with a null extraction and does not fail the request
- Deleting a project removes its uploads

**Tests**

- `upload` validation — table-driven over accepted, rejected, oversize, count overflow
- `storage` — a hostile filename (`../../etc/passwd`) is replaced, not honored
- `extract/pdf`, `extract/docx` — extract expected text from small fixtures
- `extract` — a corrupt file returns null rather than throwing
- Route — multipart accepted; oversize rejected with the contract's error shape

**Notes**

- **Never trust the uploaded filename or the client-declared MIME type.** Sniff the content and generate the stored name.
- Extraction is best-effort. A scanned PDF with no text layer should produce a documented null, not a failed request.

---

### ══ INTEGRATION GATE I-1 ══

**Pairs:** AI-1, AI-3 ↔ BE-1, BE-2, BE-4

**Proves:** the agent can call a model, record usage, and write files it is given.

- [ ] A model call through the mock provider records a `UsageEvent` via the real service
- [ ] A schema-violating response retries and then fails cleanly
- [ ] Prompt fixtures render deterministically
- [ ] No prompt contains a hardcoded stack convention
- [ ] Stub runtime refuses to start in production

**Exit criteria:** all five pass. Until they do, no AI phase may depend on a real model call.

---

### ══ INTEGRATION GATE I-2 ══

**Pairs:** AI-2, AI-4 ↔ BE-3, BE-4

**Proves:** the agent can read and modify a real workspace, and the result is tracked.

- [ ] The agent reads a fixture project from a real workspace and edits a file
- [ ] The edit appears as a git commit with a human-readable message
- [ ] `retrieve()` returns the correct file set for a change request against a real workspace
- [ ] Path traversal is rejected against the real filesystem
- [ ] Usage events are recorded for the agent's tool activity

**Exit criteria:** all five pass. **This is the first point where the agent does something real** — everything before it is unit-tested in isolation.

---

# Wave 2 — Specs and gates

Phases: **BE-6, AI-5, BE-7, BE-8**

```
BE-5 → BE-6 ──▶ AI-5
       BE-7
       BE-8
```

---

## BE-6: Spec

**Goal:** store, version, approve, and stale the four spec artifacts.

**Depends on:** BE-5

**Deliverables**

- `packages/core/src/modules/spec/spec.service.ts`, `spec.repository.ts`
- `packages/core/src/modules/spec/versioning.ts` — create a new version rather than mutating
- `packages/core/src/modules/spec/staleness.ts` — mark downstream specs STALE when an upstream spec is approved
- `packages/core/src/modules/design/design.service.ts` — DESIGN.md parse, serialize, lint, and export
- `apps/web/src/app/api/projects/[id]/specs/route.ts` — list (latest per type)
- `apps/web/src/app/api/projects/[id]/specs/generate/route.ts` — trigger generation (wired to AI-5)
- `apps/web/src/app/api/projects/[id]/specs/[specId]/{approve,revise,reject}/route.ts`

**Exit criteria**

- Four spec types: `PRD`, `DESIGN`, `DATA_MODEL`, `APP_STRUCTURE`
- Approving a spec creates an approval record and **does not mutate prior versions**
- Revising creates a new version; the previous version remains retrievable
- Approving an upstream spec marks **all** downstream approved specs STALE
- A STALE spec cannot be re-approved without being revised or explicitly re-confirmed
- List responses return only the latest version per type
- `design.service` round-trips a DESIGN.md document and exports to `css-tailwind` and `json-tailwind`

**Tests**

- `versioning` — revise creates version n+1; version n is unchanged and still fetchable
- `staleness` — table-driven: approving PRD stales DESIGN, DATA_MODEL, APP_STRUCTURE; approving APP_STRUCTURE stales nothing
- Approve — approving a STALE spec returns a conflict
- `design.service` — parse → serialize is stable; lint surfaces a broken token reference; export produces a non-empty `@theme` block

**Notes**

- **Staleness is the rule that keeps the pipeline honest.** Without it, a user can edit the PRD and the app is built from a data model derived from the old PRD. **Test the block, not just the state.**
- Specs stored as JSONB with a Zod schema per type. Validate on write so a malformed spec never reaches the database.
- `design.service` shells out to the `@google/design.md` CLI. Wrap it so a CLI failure returns a typed error rather than crashing the request.

---

## AI-5: Spec generation

**Goal:** turn user input into four schema-valid, approvable specs.

**Depends on:** AI-3, AI-4, **BE-6**

**Deliverables**

- `packages/core/src/modules/agent/workflow/steps/{pm-questions,generate-prd,generate-design,generate-data-model,generate-app-structure}.ts`
- `packages/core/src/modules/agent/validators/` — Zod schemas per spec type, **shared with BE-6**
- Integration into `apps/web/src/app/api/projects/[id]/specs/generate/route.ts`

**Exit criteria**

- `pm-questions` returns **exactly 3–5 questions**, each with 2–4 suggested options, and asks nothing about visual design, copy, or labels
- Unanswered questions become explicit, labeled assumptions in the PRD
- PRD generation includes a structured business-rules section: **invariants, state machine, permission matrix, validation rules, money rules, side effects**
- Design generation produces **machine-consumable tokens** — a DESIGN.md document that parses and exports to Tailwind — not prose
- Design generation always produces a token set even with no reference, logo, or preset
- Data model generation produces a Prisma schema that parses
- App structure generation produces pages, endpoints, components — and **every endpoint has both a request and a response type**
- Every generated spec validates against its Zod schema before being returned; failure retries, then fails
- Generation streams progress events so the UI is not a spinner

**Tests**

- `pm-questions` — count within bounds; every question has options; **no design-related question appears (denylist assertion)**
- Assumptions — an unanswered question appears as a labeled assumption in the PRD
- `generate-design` — output parses as DESIGN.md; exports to a non-empty `@theme`; produces tokens with a completely empty input
- `generate-prd` — business-rules section present with all six subsections
- `generate-data-model` — output parses as Prisma
- `generate-app-structure` — every endpoint has both a request and response type
- Schema validation — a malformed fixture triggers a retry, then fails

**Notes**

- **The design output must be tokens, not prose.** If it produces a mood description, the design phase changes nothing about the generated app. **Assert the export step produces real CSS.**
- **The business-rules section is what makes the test agent meaningful later.** Without structured rules, tests can only verify what the code does, not what was asked for. This is the highest-leverage addition in the AI track.
- The pm-questions denylist test enforces the "architecture-relevant only" rule. Without it, the agent drifts toward asking about colors and button labels.

---

## BE-7: Credential

**Goal:** store third-party keys encrypted, return them masked, inject them at run time.

**Depends on:** BE-3, BE-6

**Deliverables**

- `packages/core/src/modules/credential/credential.service.ts`, `repository.ts`
- `packages/core/src/modules/credential/inject.ts` — decrypt and write the workspace `.env` with `0600`
- `apps/web/src/app/api/projects/[id]/credentials/route.ts` — list (masked)
- `apps/web/src/app/api/projects/[id]/credentials/[service]/route.ts` — put, delete
- Service registry: `google_oauth`, `stripe`, `sendgrid`, `aws_s3` with required key names

**Exit criteria**

- Credentials encrypted at rest with AES-256-GCM; the database contains no plaintext
- List responses return masked values showing only the last four characters
- **A plaintext secret never appears in a log, an error message, or a response**
- Writing the workspace `.env` sets file mode `0600`
- Deleting a credential rewrites the `.env` without that key
- An unknown service name is rejected with a validation error

**Tests**

- `credential.service` — create stores ciphertext; read returns the original; list returns masked values
- **Log assertion** — capture log output during a create/read cycle and assert the secret string does not appear
- `inject` — writes the `.env` with expected keys; file mode is `0600`
- Delete — removes the row and the key from `.env`
- Unknown service — rejected

**Notes**

- The log assertion is a **security test**. Capture the logger output and grep for the secret; do not rely on reading the code.
- The service registry defines required keys per service so the frontend and the agent both know what to ask for. Keep it in the contracts package so it cannot drift.

---

## BE-8: Version

**Goal:** git-backed history, diffs, and revert.

**Depends on:** BE-4

**Deliverables**

- `packages/core/src/modules/version/git.service.ts` — commit, log, diff, revert, checkout
- `packages/core/src/modules/version/version.service.ts` — record commits, produce simplified diffs
- `packages/core/src/modules/version/diff.ts` — file-count, line-count, summary derivation
- `apps/web/src/app/api/projects/[id]/versions/route.ts`
- `apps/web/src/app/api/projects/[id]/versions/[versionId]/{diff,revert}/route.ts`

**Exit criteria**

- Every mutation that touches files produces a commit with a human-readable message
- Commit messages follow the documented forms (`Initial project`, `Approve {spec} v{n}`, `{change description}`, `Checkpoint: cancelled during {step}`, `Revert: {message}`)
- History returns newest-first with hash, message, files-changed count, timestamp
- Diff returns a simplified summary plus the raw diff on request
- **Revert creates a new commit; history is never rewritten**
- The initial commit cannot be reverted
- Revert on a dirty workspace **refuses** rather than discarding uncommitted work

**Tests**

- `git.service` — commit, log ordering, diff between two commits, revert creates a new commit
- `version.service` — a recorded version matches the commit; the initial commit is flagged non-revertible
- Revert — clean tree succeeds and produces a new commit; dirty tree returns a conflict
- `diff` — line counts match a known fixture

**Notes**

- **Revert must never rewrite history.** `git reset --hard` is prohibited; use `git revert` or a checkout producing a forward commit. History stays linear and auditable.
- The undo-scope disclosure in the frontend (FE-8) reflects a real limitation: reverting restores files, **not database state**. Do not attempt to reverse migrations in this phase.

---

### ══ INTEGRATION GATE I-3 ══

**Pairs:** AI-5 ↔ BE-5, BE-6

**Proves:** real user input becomes four validated, stored, approvable specs.

- [ ] A real PDF upload extracts text and feeds spec generation
- [ ] All four specs are generated, validate against their schemas, and persist
- [ ] The design spec exports to real Tailwind CSS
- [ ] The PRD contains a structured business-rules section with all six subsections
- [ ] Revising an upstream spec marks downstream specs STALE, and approving a STALE spec is blocked
- [ ] Generation streams progress events

**Exit criteria:** all six pass.

---

### ══ INTEGRATION GATE I-4 ══

**Pairs:** BE-7, BE-8

**Proves:** credentials and versioning are safe and correct.

- [ ] A credential is injected into a workspace `.env` with mode `0600`
- [ ] No plaintext secret appears in a log, a response, or a commit
- [ ] A revert produces a new commit and leaves history linear
- [ ] Revert on a dirty workspace refuses

**Exit criteria:** all four pass. **This is a backend-only gate** — the AI track continues on I-3 refinements in parallel. It is the one point where the two tracks legitimately diverge.

---

# Wave 3 — Execution and verification

Phases: **BE-9, BE-10, AI-6, AI-7, AI-8**

```
BE-9 ──▶ AI-6 ──▶ AI-7
  │        └────▶ AI-8
  └────────────────────▶ (both)
BE-10 ──▶ AI-7
```

**This is the highest-risk wave.** Three AI phases wait on execution and streaming; a backend slip here stalls all three.

---

## BE-9: Execution

**Goal:** provision, run, stream, and tear down per-project containers.

**Depends on:** BE-7, BE-8

**Deliverables**

- `packages/core/src/platform/container/docker.ts` — full `DockerRuntime` implementation with dockerode
- `packages/core/src/modules/execution/docker/manager.ts` — provision, start, stop, destroy
- `packages/core/src/modules/execution/docker/compose.ts` — per-project compose with limits and labels
- `packages/core/src/modules/execution/docker/network.ts` — per-project network
- `packages/core/src/modules/execution/docker/health.ts` — readiness and health probes
- `packages/core/src/modules/execution/terminal/session.ts` — `exec` into the app container
- `packages/core/src/modules/execution/terminal/stream.ts` — line-split stdout/stderr to the event bus
- `packages/core/src/modules/execution/preview/provider.ts` — allocate preview subdomain, apply Caddy labels
- `docker/` — Caddyfile and the KairoPro app image
- `scripts/provision-project.ts` — manual provisioning for development

**Exit criteria**

- Provisioning creates a network, an app container, and a database container with CPU and memory limits
- Containers run **non-root**, with no host mounts, no `--privileged`, no Docker socket access
- The database health check gates the app container's start
- `exec` runs a command inside the app container and returns exit code, stdout, stderr
- Long-running commands stream line by line and honor a timeout
- A preview subdomain resolves to the running app over HTTPS
- `stop` preserves volumes; `destroy` removes volumes and the network
- Orphaned networks and containers with no matching project record are detectable

**Tests**

- `compose` — generates expected limits, labels, env references for a fixture project
- `manager` — provision creates expected resources (mocked Docker client); stop preserves volumes; destroy removes them
- **`terminal/stream` — line-splits chunked output correctly, including a partial line at a chunk boundary**
- `health` — reports ready only after the app responds; times out with a typed error
- Orphan detection — finds a fake orphan by label

**Notes**

- **The line-splitter at a chunk boundary is the classic bug here.** A 4KB read can split a line in half; the test must cover it explicitly.
- Run commands with `sh -lc` **inside the container**, never on the host. The container is the isolation boundary and the only place generated code may execute.
- Resource limits are not optional. An unbounded generated app can take down the host for every other project.
- **When this lands, swap `StubContainerRuntime` for `DockerRuntime`.** AI-2 and AI-6 code does not change — that is the payoff of the stub-first strategy.

---

## AI-6: Code generation

**Goal:** turn approved specs into a project that type-checks and builds.

**Depends on:** AI-5, AI-4, **BE-9**

**Deliverables**

- `packages/templates/nextjs-shadcn/template.json` — id, stack, machine-readable conventions
- `packages/templates/nextjs-shadcn/skeleton/` — the scaffold copied verbatim
- `packages/core/src/modules/agent/workflow/steps/{scaffold,freeze-contracts,generate-code}.ts`
- `packages/core/src/modules/agent/phases/backend.ts`, `phases/frontend.ts`
- `packages/core/src/modules/agent/validators/typecheck.ts` — run `tsc --noEmit` and parse errors

**Exit criteria**

- Scaffolding copies the template and makes an initial commit
- `freeze-contracts` writes a single shared types module plus Zod schemas, imported by both API routes and frontend consumers
- Generation order enforced: schema → migrate → API routes → pages → auth configuration
- **Each file is generated, type-checked, and fixed before the next file is generated**
- Type errors from `tsc` are parsed into structured `{ file, line, message }` records
- The backend and frontend phases both consume the frozen contracts and never invent an API shape
- Conventions are injected from `template.json`, **not from prompt text**
- Generation respects the cancel flag at file boundaries
- The finished project type-checks and builds, or failures are recorded as typed errors

**Tests**

- `scaffold` — copies the expected file set; makes an initial commit; is idempotent
- `freeze-contracts` — produces types + Zod; the same types are importable from a fixture API route and a fixture component
- `typecheck` — parses real `tsc` output including multi-error output
- Generation order — a schema failure halts before API generation
- Per-file loop — a file failing type-check triggers a fix before the next file is requested
- Cancel — a flag set mid-run stops at the next file boundary and commits a checkpoint
- **Conventions — a template with a different alias produces generated imports using that alias** (proves conventions come from the template)

**Notes**

- **File-by-file generation is a deliberate trade.** More round-trips and wall-clock, in exchange for localized failures. Generating thirty files and then fixing compounding errors costs far more in tokens and reliability.
- **The conventions test is what proves the second-template path stays cheap.** If it fails, conventions have leaked into prompts.
- `packages/templates/` must stay excluded from `tsconfig.json` and ESLint, or the build type-checks the template's dependency tree.

---

## BE-10: Build orchestration and SSE

**Goal:** drive the build workflow, stream it, support cancel and resume.

**Depends on:** BE-9, BE-6

**Deliverables**

- `packages/core/src/modules/build/build.service.ts` — start, cancel, status
- `packages/core/src/modules/build/workflow.ts` — **step sequence, checkpointing, cancel checks (backend-owned)**
- `packages/core/src/modules/build/logs.ts` — persist `BuildLog` rows with per-build `seq`
- `apps/web/src/app/api/projects/[id]/builds/route.ts` — start, list
- `apps/web/src/app/api/projects/[id]/builds/[buildId]/{route,cancel,stream}.ts`
- `packages/core/src/modules/build/sse/encode.ts` — frame encoding with `id`, `event`, `data`

**Exit criteria**

- Starting a build creates a `Build` row and returns an id immediately; work continues asynchronously
- Only one active build per project; a second start returns a conflict
- **Every emitted event is persisted with a monotonic `seq` before being sent**
- SSE replays from `Last-Event-ID` on reconnect with no gaps and no duplicates
- A keepalive comment is sent every 15 seconds
- Cancel sets the flag; the workflow stops at the next safe boundary and records a checkpoint
- A cancelled build leaves the workspace consistent with a checkpoint commit
- Cancel is idempotent
- An internal error is written to `InternalError`; the client receives only a generic status

**Tests**

- `logs` — sequence increments per build; a concurrent writer cannot produce a duplicate (constraint enforced)
- SSE — replay from a given id returns exactly the following events; a kept-alive connection stays open
- `workflow` — checks cancel at every step boundary; a cancelled run records a checkpoint
- Cancel — idempotent; a second call returns the same state
- **Error path — an injected failure writes `InternalError` and the SSE stream emits a user-safe terminal event with no stack trace**

**Notes**

- **Persist before you emit.** If the event goes out first and persistence fails, a reconnecting client loses it. Write, then send.
- Reconnection correctness is the whole point of the `seq` column. **Test the replay path directly** rather than trusting the happy path.
- Cancel stops at a boundary, not mid-write. A half-written file is worse than a delayed cancel.

---

## AI-7: Recovery

**Goal:** bound failure, recover where possible, never degrade correctness silently.

**Depends on:** AI-6, **BE-10**

**Deliverables**

- `packages/core/src/modules/agent/recovery/fix-loop.ts` — bounded repair
- `packages/core/src/modules/agent/recovery/classify.ts` — classify a failure (type, build, runtime, test, provider)
- `packages/core/src/modules/agent/recovery/degradation.ts` — the ladder: full → simpler → simplest → omit
- `packages/core/src/modules/agent/recovery/rules.ts` — **the degradable / never-degradable policy**
- `packages/core/src/modules/agent/recovery/logger.ts` — write `InternalError` with full context

**Exit criteria**

- Per-file fix attempts capped at 3; per build, **5 attempts per error, 3 distinct approaches**
- Each retry includes the previous attempt and the observed failure in the prompt
- Failures are classified before a fix is attempted; an unrecognized failure is **logged rather than blindly retried**
- **`rules.ts` enumerates never-degradable categories: authorization, tenant isolation, money handling, data invariants, audit trails**
- A never-degradable failure does **not** degrade — it halts that unit, records it, and marks the build as requiring attention
- A degradable failure walks the ladder and records each step
- Every failure writes an `InternalError` with step, type, message, file, attempt, approach, resolution
- Every degradation emits an internal event and produces user-facing copy describing the **outcome**, not the failure
- Exhausting all budgets ends the unit cleanly rather than looping

**Tests**

- `fix-loop` — succeeds on attempt 2; exhausts at the cap; each attempt's prompt includes the prior failure
- `classify` — table-driven over known shapes; unknown shapes are not retried
- **`rules` — authorization, money, and tenant-isolation failures do not degrade; a layout failure does**
- `degradation` — walks the ladder; records each step; stops at the simplest
- `logger` — writes a row for every failure with all required fields
- **User-facing copy test — for every degradation path, the generated message contains none of a denylist of error terms**

**Notes**

- **`rules.ts` is the most important file in this phase.** The product's promise is that the user always receives a working app. That promise is correct for presentation and dangerous for correctness. Silently simplifying "only managers can approve" into "anyone can approve" is a security hole shipped with a success message.
- Implement `rules.ts` as **data, not logic**, so a reviewer reads the policy in one screen.
- The user-facing copy assertion mirrors the frontend's simplified-notice test. Both must exist — the frontend asserts what it renders, this asserts what it generates.

---

## AI-8: Test agent

**Goal:** an independent agent that verifies the app against the spec, not against the code.

**Depends on:** AI-6, AI-7, **BE-9**

**Deliverables**

- `packages/core/src/modules/agent/phases/test-authoring.ts`
- `packages/core/src/modules/agent/workflow/steps/run-tests.ts`
- `packages/templates/nextjs-shadcn/skeleton/` — Vitest and Playwright scaffolding, project test script
- `packages/core/src/modules/agent/test/report.ts` — parse runner output into structured results
- Integration into the build workflow between code generation and preview

**Exit criteria**

- The test-authoring phase receives the approved specs and contract types, and **never the implementation**
- Tests generated at three levels: unit (validation, business rules), integration (API routes against a real DB), e2e (primary flows)
- Test cases derive from the PRD's business-rules section — invariants, permission matrix, and state machine each produce assertions
- The permission matrix produces **at least one negative test per role-action pair**
- Tests run in the project container; results parsed into structured pass/fail records
- Failures feed the fix loop with the **failing assertion**, not just an exit code
- **The fix loop may not modify a test to make it pass**, except when the test contradicts an approved spec — and that exception is recorded as an internal event
- Green tests proceed to preview; unresolved failures do not silently proceed

**Tests**

- `test-authoring` — **assert the implementation is not present in the assembled context**
- Business rules → tests — a fixture invariant produces a corresponding assertion; a fixture permission matrix produces one negative test per pair
- `report` — parses Vitest and Playwright output into structured results
- Fix loop — a failing test produces a fix attempt with the assertion text included
- **Guardrail test — an attempted test modification is rejected and logged, except against a spec contradiction**
- Workflow — unresolved failures are surfaced rather than swallowed

**Notes**

- **This is the one true agent boundary in the system.** Its value is independence: tests written from code verify the implementation is self-consistent; tests written from the spec verify it does what was asked. The first is nearly worthless for catching requirement errors.
- This is the most expensive purely-quality phase and **may be deferred to V1.1** — the slot exists in `workflow/steps/` and `phases/`, so deferring requires no structural change. **If deferred, do not replace it with the fix loop** — they catch different classes of error.

---

### ══ INTEGRATION GATE I-5 ══

**Pairs:** AI-6 ↔ BE-9

**Proves:** approved specs become a running application.

- [ ] Scaffolding copies the template and commits
- [ ] Contracts are frozen and imported by both API routes and components
- [ ] Generated code type-checks after each file
- [ ] The project builds and runs in a real container
- [ ] The app responds `200` at its preview URL
- [ ] Containers run non-root with resource limits

**Exit criteria:** all six pass. **This is the largest integration point in the project** and the one most likely to surface interface mismatches.

---

### ══ INTEGRATION GATE I-6 ══

**Pairs:** AI-7 ↔ BE-10

**Proves:** builds stream reliably and failures are handled per policy.

- [ ] A build emits status, terminal, and code events
- [ ] Every event is persisted before it is sent
- [ ] A forced disconnect and reconnect resumes with no gaps or duplicates
- [ ] A deliberately broken generation triggers the fix loop and recovers
- [ ] A never-degradable failure halts rather than silently simplifying
- [ ] No user-facing message contains a technical error

**Exit criteria:** all six pass.

---

### ══ INTEGRATION GATE I-7 ══

**Pairs:** AI-8 ↔ BE-9

**Proves:** independent verification works end to end.

- [ ] The test agent's context provably excludes the implementation
- [ ] Generated tests cover unit, integration, and e2e levels
- [ ] The permission matrix produces negative tests per role-action pair
- [ ] Tests execute in the project container and results parse correctly
- [ ] A failing test feeds the fix loop with the assertion text
- [ ] An attempted test modification is rejected and logged

**Exit criteria:** all six pass.

---

# Wave 4 — Delivery

Phases: **BE-11, AI-9**

```
BE-11 ──▶ AI-9
BE-8  ──▶ AI-9
```

---

## BE-11: Deploy, export, and jobs

**Goal:** deploy to a live URL, export to GitHub, keep the host from silting up.

**Depends on:** BE-10

**Deliverables**

- `packages/core/src/modules/deploy/deploy.service.ts` — subdomain validation, reservation, production routing
- `packages/core/src/modules/deploy/dns.ts`, `ssl.ts`
- `packages/core/src/modules/deploy/github.service.ts` — OAuth token, repo creation, push, README generation
- `apps/web/src/app/api/projects/[id]/{deploy,export/github}/route.ts`
- `apps/web/src/app/api/webhooks/github/route.ts`
- `packages/core/src/platform/jobs/definitions/` — `cleanup-inactive.ts`, `cleanup-orphans.ts`, `health-probe.ts`, `prune-logs.ts`
- Rate limiting middleware on generation, build, and deploy endpoints
- `scripts/cleanup-inactive.ts`, `scripts/health-check.ts`

**Exit criteria**

- Subdomain validation rejects reserved words, invalid characters, and taken names
- Deployment makes the container persistent, applies production routing, records `deployedUrl`
- **A deployed app survives the inactivity cleanup that stops previews**
- HTTPS is active on the deployed subdomain
- GitHub export creates a repo, pushes the default branch, writes a README with setup steps
- Export fails cleanly when GitHub is not connected, returning a typed error the frontend handles
- Inactive preview containers stop after two hours; deployed containers do not
- Orphaned containers and networks are removed
- Build logs older than retention are pruned
- Rate limits return `429` with a retry hint

**Tests**

- Subdomain validation — table-driven over valid, reserved, malformed, taken
- `deploy` — reserves the subdomain; sets persistence; records the URL; a duplicate returns a conflict
- `github.service` — creates a repo and pushes (mocked API); failure paths return typed errors
- **`cleanup-inactive` — stops an idle preview; leaves a deployed app alone; skips a recently active preview**
- `cleanup-orphans` — removes a container with no project; leaves a matching one
- `prune-logs` — deletes only rows past retention
- Rate limiting — the nth request in a window is rejected

**Notes**

- **Deployed apps must be exempt from inactivity cleanup.** Getting this backwards takes customer sites offline — **the highest-consequence bug in this phase.** The test explicitly covers it.
- The GitHub token is used transiently for the push and never written into the workspace or a commit.
- Reserved subdomains must include anything colliding with infrastructure: `www`, `api`, `app`, `admin`, `preview`, `status`, and the platform's own hostnames.

---

## AI-9: Change requests

**Goal:** modify an existing project without breaking what already works.

**Depends on:** AI-4, AI-6, AI-7, AI-8, **BE-8**

**Deliverables**

- `packages/core/src/modules/agent/workflow/steps/change-request.ts`
- `packages/core/src/modules/agent/context/change-summary.ts` — rolling summary of recent changes
- `packages/core/src/modules/agent/prompts/change.md`
- Contract drift check integration
- `apps/web/src/app/api/projects/[id]/changes/route.ts`

**Exit criteria**

- A change request produces a **plan first** — affected files, intended changes, diff summary — and waits for approval before modifying anything
- Context is retrieved through `retrieve()`, not assembled ad hoc
- The change is applied, type-checked, built, and tested before being presented
- A contract change regenerates the shared types module and re-runs the contract check
- Existing tests still pass after a change; a regression blocks the change from being marked complete
- A rolling summary of the last N changes is included so long sessions do not degrade into stale-context regressions
- The change produces a single commit with a human-readable message
- Cancelling a change request leaves the workspace unchanged

**Tests**

- `change-request` — produces a plan without modifying files; applying requires an approval signal
- Context — a change to a task field retrieves schema, API route, and form
- Contract drift — a deliberate breaking change is detected and fails the contract check
- Regression — a change that breaks an existing test is not marked complete
- Rollback — a cancelled change leaves the workspace byte-identical
- `change-summary` — after N changes the summary reflects the most recent and stays within its token budget

**Notes**

- **Plan-before-apply matters more here than anywhere else.** On change #10 the user has working software to lose; on change #1 they have nothing. The gate matters more later, not less.
- **Context degradation is the known failure mode of long iteration.** Replit documents small changes producing surprising regressions around 50 turns as the window fills with stale plans and diffs. The rolling summary plus `retrieve()` is the mitigation — **build both now** rather than discovering the problem in production.
- Undo restores code, not database state. If a change runs a migration, say so rather than implying a full rollback.

---

### ══ INTEGRATION GATE I-8 ══

**Pairs:** AI-9 ↔ BE-11, BE-8

**Proves:** the complete V1 flow.

- [ ] Deploy a project end to end
- [ ] Request a change; it is planned, applied, tested, and deployed
- [ ] No regression in previously passing tests
- [ ] The change produces a single commit
- [ ] A cancelled change leaves the workspace unchanged
- [ ] Contract drift is detected when a change breaks the contract

**Exit criteria:** the full flow completes — **describe → approve → build → deploy → change → redeploy.**

---

## Integration test matrix

These tests belong to neither track alone. They live in `tests/integration/` and are owned jointly.

| Test                               | Proves                                           | Wave |
| ---------------------------------- | ------------------------------------------------ | ---- |
| `model-call-records-usage`         | AI-1 → BE-4 seam                                 | 1    |
| `stub-runtime-refuses-production`  | The stub cannot run generated code in production | 1    |
| `agent-edits-become-commits`       | AI-2 → BE-8 seam                                 | 1    |
| `context-retrieval-real-workspace` | AI-4 reads a real indexed project                | 1    |
| `upload-to-specs`                  | BE-5 → AI-5 → BE-6 pipeline                      | 2    |
| `spec-revision-stales-downstream`  | BE-6 staleness rule under real generation        | 2    |
| `credential-never-logged`          | BE-7 during a full generation run                | 2    |
| `specs-to-running-app`             | AI-6 → BE-9 end to end                           | 3    |
| `build-stream-resume`              | BE-10 SSE with an AI-generated build             | 3    |
| `recovery-respects-rules`          | AI-7 halts on a never-degradable failure         | 3    |
| `test-agent-no-implementation`     | AI-8 context isolation under real conditions     | 3    |
| `full-flow`                        | I-8 complete                                     | 4    |

**Common failure mode these catch:** both tracks pass their own tests while the seam between them is wrong — a shape mismatch, a missing field, or an ownership dispute that only appears when the halves run together.

---

## Cross-track conventions

### Backend layering

| Layer         | Responsibility                                                      | Must not                         |
| ------------- | ------------------------------------------------------------------- | -------------------------------- |
| Route handler | Session, `RequestContext`, one service call, revalidate, map errors | Contain domain logic             |
| Service       | Business rules, orchestration, transactions                         | Import `next/*`                  |
| Repository    | Prisma queries only                                                 | Contain business rules           |
| Platform      | Infrastructure behind an interface                                  | Be imported directly by services |

### Model usage

| Task                                                   | Model tier                   |
| ------------------------------------------------------ | ---------------------------- |
| Routing, file selection, summarization, classification | Cheapest reliable            |
| Spec generation, code generation, fixing               | Strongest available          |
| Prompt assembly, validation, parsing, running tests    | **No model — deterministic** |

If a step can be deterministic, it must be. Model calls are the expensive, slow, unreliable path.

### Budgets

Every phase declares and enforces: max iterations, max tokens, max wall-clock, max retries. Budget exhaustion ends the unit cleanly with a typed error. **No phase may loop unbounded.**

### Error handling

- Services throw typed errors from `packages/core/src/lib/errors.ts`.
- Routes catch once at the boundary and map to status + a user-safe message.
- Internal detail — stack traces, Prisma errors, container output — is logged, never returned.
- A project the caller cannot access returns **404, never 403**.

### Testing conventions

- **The entire AI test suite runs offline against the mock provider.**
- Docker and GitHub are mocked at the client boundary, not the service boundary.
- Safety tests (path confinement, credential exposure, error-copy denylists) are explicit and are **never removed to make a refactor pass**.
- No coverage target.

### What is never automated

- Weakening a test to make a build pass (except a recorded spec contradiction)
- Degrading authorization, tenant isolation, money handling, or data invariants
- Showing a technical error to a user
- Unbounded retry

---

## Risk register

**Project-wide risks live in `IMPLEMENTATION_PLAN.md §8`.** This table covers only the risks specific to running these two tracks in parallel.

| Risk                                                | Impact                                          | Mitigation                                                                      |
| --------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| **BE-2 deprioritized**                              | AI cannot start at all                          | **BE-2 is the highest-leverage phase — build it first**                         |
| Seam interface changes after AI-2 starts            | Rework on both sides                            | Interfaces frozen in BE-2; changes require both owners                          |
| Stub behavior diverges from the real implementation | AI passes against the stub, fails in production | One integration test per seam, run at the wave gate                             |
| Two tracks edit `workflow.ts`                       | Merge conflicts, unclear ownership              | Backend owns the engine; AI owns the steps; `WorkflowStep` is the contract      |
| **BE-9 or BE-10 slips**                             | AI-6, AI-7, AI-8 stall together                 | Stub runtime lets AI-6 and AI-8 develop early; only real verification waits     |
| Integration gates skipped under schedule pressure   | Two green tracks, broken product                | Gates are pass/fail and block wave completion                                   |
| Ownership boundary crossed under time pressure      | Merge conflicts, unclear accountability         | Ownership table in §4; changes across a boundary require a request, not an edit |

---

## Open items

**Project-wide open items live in `IMPLEMENTATION_PLAN.md §9`** — that is the canonical list.

Decisions recorded in §0: dev database (PostgreSQL via Docker), MSW skipped, mock-first LLM, F2 folded into the BE-4 rewire.

Two items still bear directly on this document:

- **Concrete LLM provider undecided** (Anthropic vs OpenAI) — the mock-first decision unblocks the AI-1 interface, the mock provider, and every downstream phase; only `router.ts` model names and the concrete `providers/*.ts` wait for an API key.
- **AI-8 (Test Agent) may ship in V1.1** — confirm before starting Wave 3.

---

## Definition of done

- [ ] Every seam in §7 has an interface written before its implementation
- [ ] Every stub fails closed in production
- [ ] BE-1 … BE-11 and AI-1 … AI-9 complete, each with passing tests
- [ ] All eight integration gates (I-1 … I-8) pass
- [ ] Every test in the integration matrix passes
- [ ] No file has been edited across an ownership boundary
- [ ] `lib/contracts/**` changes were agreed by both owners
- [ ] No file under `packages/core/src/modules/**` imports `next/*` (ESLint rule passes)
- [ ] No plaintext secret appears in any log, response, database column, or commit
- [ ] Path traversal is rejected at every filesystem boundary
- [ ] Foreign project access returns 404
- [ ] SSE reconnect replays exactly, with no gaps or duplicates
- [ ] Cancel leaves a consistent workspace with a checkpoint commit
- [ ] Deployed apps are exempt from inactivity cleanup
- [ ] Usage events emitted for every LLM call, build, and container-minute
- [ ] No container runs privileged, as root, or with a host mount
- [ ] The entire AI test suite runs offline
- [ ] `recovery/rules.ts` prevents degradation of authorization, money, and tenant isolation
- [ ] The test agent does not receive the implementation
- [ ] No user-facing message contains a technical error
- [ ] The full V1 flow completes: describe → approve → build → deploy → change → redeploy

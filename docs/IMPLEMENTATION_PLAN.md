# KairoPro — Master Implementation Plan

Phase-wise plan for building KairoPro V1, split into three tracks: **Frontend**, **Backend**, and **AI**.

| Document                             | Track                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `IMPLEMENTATION_PLAN.md` (this file) | Master sequencing, dependencies, conventions                                                                                              |
| `FRONTEND_PLAN.md`                   | FE-1 … FE-10                                                                                                                              |
| `BACKEND_AI_PLAN.md`                 | Phase 0 … Phase 20 — one linear sequence (legacy IDs BE-1 … BE-11, AI-1 … AI-9 kept as durable identifiers) with integration gates inline |

**Backend and AI share one document because they are one work stream.** The AI track was blocked by backend work eight times, so the two were planned together with explicit seams, stubs, and integration gates — and are now serialized into a single linear sequence, Phase 0 … Phase 20, for one implementer. See `BACKEND_AI_PLAN.md` §1.

---

## 1. Strategy

Three tracks are planned independently but share one foundation. The strategy is:

1. **Contracts first.** Zod schemas define every request and response before any implementation exists. Every phase consumes them.
2. **Frontend shipped first, visual-first.** Every screen is built from the Stitch exports with mock data hardcoded in components. The MSW layer (P0.5) was never built and is skipped by decision — integration is now a **per-page rewire**: each backend phase swaps its page's hardcoded data for real services and endpoints.
3. **Contracts still come first for the backend.** P0.4 is written against the shapes the shipped pages already display, so the backend implements to a fixed target and the rewire is a data-source swap, not a redesign.
4. **AI is last and deepest.** It depends on backend storage, execution, and streaming, and on the frontend's spec and build surfaces existing to display its output.

**Why frontend-first still worked:** the only real risk in building the frontend ahead of the backend is building against imagined APIs. The shipped pages now serve as the concrete API target — P0.4 writes the contracts by reading them off the pages, so the backend still implements to a fixed target.

---

## 2. Locked decisions

| Decision         | Choice                                                      | Consequence                                                                           |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Contracts        | `packages/contracts/src/*.ts` — Zod schemas, types inferred | One source for types, runtime validation, MSW, and backend routes                     |
| Initial render   | React Server Components, fetching services directly         | Read-only pages ship zero JS; no self-fetch anti-pattern                              |
| Interactive data | TanStack Query, seeded with `initialData`                   | Polling, optimistic updates, pagination, cache invalidation                           |
| Streams          | Zustand ring buffers                                        | High-frequency terminal and code output stays out of the query cache                  |
| Mocking          | None in dev — MSW skipped by decision (2026-09-13)          | Frontend shipped with in-component mocks; MSW may return for frontend unit tests only |
| Dev database     | PostgreSQL 18 via compose in `docker/` (created in BE-1)    | Single engine for dev and throwaway test databases                                    |
| Unit tests       | Vitest + React Testing Library                              | Fast, ESM-native, no Jest config friction                                             |
| E2E tests        | Playwright, Phase FE-10                                     | Deferred until flows are stable                                                       |
| Platform seams   | Interfaces with local implementations                       | Redis/S3/multi-host later become file swaps                                           |
| Repo layout      | pnpm workspaces + Turborepo                                 | Package boundaries enforced structurally, not by lint                                 |
| Prisma           | Prisma 7, `prisma-client` generator, explicit output path   | `@kairopro/db` owns the client; see §2 Repository layout                              |
| Styling          | Tailwind CSS v4 — CSS-first `@theme`, no JS config          | Matches the `DESIGN.md` export format exactly                                         |

### Data layer ownership

This distinction is applied consistently across the frontend track.

| Owner              | Responsibility                                                | Examples                                                           |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| **RSC**            | Initial page render. Calls a service directly.                | Dashboard list, gate content, settings                             |
| **TanStack Query** | Anything that refetches while the user watches; all mutations | Build status polling, approve gate, version history, file contents |
| **Zustand**        | High-frequency append-only streams                            | Terminal lines, code deltas                                        |

**Rule:** a TanStack `queryFn` only ever runs in the browser, so it always uses HTTP. Server-side data access goes through services. This avoids the dual-runtime `queryFn` problem entirely.

### Repository layout

```
kairopro/
├── apps/
│   └── web/            Next.js — routes, UI, React Server Components
├── packages/
│   ├── contracts/      Zod schemas. Isomorphic. Zero internal deps.
│   ├── db/             Prisma schema, client, migrations, seed
│   ├── core/           modules/ + platform/. Server-only. NO next.
│   └── templates/      Generated-app scaffolding. Data, not code.
├── docs/  designs/  docker/  scripts/     repo-level, unchanged
├── pnpm-workspace.yaml  turbo.json  tsconfig.base.json  .env
```

Dependencies flow one way: `web → core → {contracts, db}`. `templates` is read at runtime, not compiled.

**The boundary is structural, not disciplinary.** `packages/core` does not list `next` as a dependency, so importing `next/*` from it fails to resolve. That is a stronger guarantee than an ESLint rule, which can be disabled in a file with a comment.

**Template exclusion is a consequence of the layout, not a rule to remember.** `packages/templates/nextjs-shadcn/skeleton/` is not referenced by any `tsconfig`, so nothing type-checks the generated app's dependency tree. The old "remember to exclude `templates/`" gotcha no longer exists.

**One root `.env`.** Both `apps/web/next.config.ts` and `packages/db/prisma.config.ts` load it explicitly. Two env files is how migrations end up pointed at a different database than the app.

---

## 3. Phase 0 — Shared foundation

Blocks all three tracks. Nothing else starts until this is complete.

| #    | Phase               | Deliverables                                                                                                                              | Exit criteria                                                                                                                                 |
| ---- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| P0.0 | Monorepo init       | pnpm workspaces + Turborepo; `apps/web` + `packages/{contracts,db,core,templates}`; `tsconfig.base.json`; single root `.env`              | `pnpm install` links exactly 5 workspace projects; the template skeleton is **not** one of them; `next` does not resolve from `packages/core` |
| P0.1 | App scaffold        | Next.js 16 App Router in `apps/web`, TypeScript 7 strict, Tailwind v4, shadcn/ui, ESLint + Prettier, Vitest                               | `pnpm dev` renders a page; `pnpm test` executes; no hardcoded hex                                                                             |
| P0.2 | Design tokens       | `DESIGN.md` → `apps/web/src/app/theme.css` via `designmd export --format css-tailwind`; Inter and JetBrains Mono loaded                   | A token gallery page renders every color, type scale, and radius                                                                              |
| P0.3 | Test infrastructure | Vitest + RTL setup, MSW node server, `renderWithProviders` helper                                                                         | One passing smoke test per setup area                                                                                                         |
| P0.4 | Contracts           | Zod schemas in `@kairopro/contracts` for Project, Spec, Build, Input, Credential, Version, Usage, Error, plus all request/response shapes | Fixtures parse; types inferred; no hand-written duplicate types                                                                               |
| P0.5 | MSW handlers        | A handler for every endpoint in the contract set; browser worker and node server                                                          | Every handler responds in dev and in tests                                                                                                    |

**Status (audited 2026-09-13):**

| #    | Status                 | Note                                                                                                                             |
| ---- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| P0.0 | Done                   | Five workspace projects; the template skeleton is not one of them; `next` does not resolve from `packages/core`                  |
| P0.1 | Done                   | The app builds and runs; `pnpm test` is not functional yet (P0.3)                                                                |
| P0.2 | Partial                | `design:export` was never run — no `theme.css`; brand tokens are hand-written in `apps/web/src/app/globals.css` (open item §9.5) |
| P0.3 | Not started            | No Vitest config anywhere; lands alongside BE-1's integration tests                                                              |
| P0.4 | Not started — **next** | Prerequisite for every BE phase whose routes validate responses                                                                  |
| P0.5 | Skipped by decision    | The frontend shipped without MSW; pages rewire directly to real endpoints                                                        |

**P0.2 detail:** tokens are generated, never hand-written. The pipeline is:

```bash
pnpm design:lint      # validates DESIGN.md against the spec + WCAG contrast
pnpm design:export    # emits @theme CSS → apps/web/src/app/theme.css
```

`DESIGN.md` is the source of truth for the KairoPro UI **and** for the generated app's theme. Editing a token means editing `DESIGN.md` and re-exporting — never editing CSS directly.

**Tailwind v4 is CSS-first.** There is no `tailwind.config.ts`; the exported `@theme { … }` block _is_ the configuration. That is why the `css-tailwind` export format maps onto this project with zero translation — the design artifact and the build config are the same file.

**P0.4 detail:** contracts live in `packages/contracts/src/` and export both the schema and its inferred type. Example shape:

```ts
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["DRAFT", "SPECIFYING", "BUILDING", "READY", "DEPLOYED"]),
  previewUrl: z.string().url().nullable(),
  deployedUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});
export type Project = z.infer<typeof ProjectSchema>;
```

---

## 4. Dependency graph

The original three-track design, kept as the design record. As executed: the frontend shipped first, and the backend/AI phases run as the linear **Phase 0 … Phase 20** sequence in `BACKEND_AI_PLAN.md`. (`P0` below is this plan's shared-foundation phase — the P0.x items — not that document's Phase 0.)

```
                         P0
        toolchain · tokens · tests · contracts · MSW
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐        ┌─────────┐        ┌─────────┐
   │ FE-1..5 │        │ BE-1..5 │        │ AI-1..4 │   Wave 1 — parallel
   └────┬────┘        └────┬────┘        └────┬────┘
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────┐        ┌─────────┐        ┌─────────┐
   │ FE-6..8 │        │ BE-6..8 │        │  AI-5   │   Wave 2
   └────┬────┘        └────┬────┘        └────┬────┘
        │                  │                  │
        │                  ▼                  ▼
        │             ┌─────────┐        ┌─────────┐
        │             │ BE-9..10│───────▶│ AI-6..8 │   Wave 3
        │             └────┬────┘        └────┬────┘
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────────────────────────────────────────────┐
   │            FE-9..10 · BE-11 · AI-9              │   Wave 4
   └─────────────────────────────────────────────────┘
```

### Cross-track dependencies

| Phase             | Blocked by        | Why                                                  |
| ----------------- | ----------------- | ---------------------------------------------------- |
| FE-1 … FE-10      | P0 only           | MSW satisfies every data need                        |
| BE-1 … BE-5       | P0 only           | Contracts define the target                          |
| AI-1, AI-2        | BE-1, BE-2        | Needs the data layer and the `ContainerRuntime` seam |
| AI-4              | BE-4              | Workspace must exist to index                        |
| AI-5 (Spec gen)   | BE-6              | Specs must be storable                               |
| AI-6 (Code gen)   | BE-9              | Generated code must run somewhere                    |
| AI-7 (Recovery)   | AI-6, BE-10       | Needs a build to fail and a stream to report on      |
| AI-8 (Test agent) | AI-6, AI-7, BE-9  | Tests must execute                                   |
| AI-9 (Changes)    | AI-4 … AI-8, BE-8 | Needs context, generation, verification, versioning  |

**No frontend phase depends on any backend phase.** This is the property that makes the frontend-first strategy work, and it is verified mechanically:

```bash
awk '/^## FE-/{f=$0} /^\*\*Depends on:\*\*/{if ($0 ~ /BE-/) print f" -> "$0}' docs/FRONTEND_PLAN.md
# expected output: none
```

---

## 5. Wave plan

> **Detail lives in `BACKEND_AI_PLAN.md`** for the backend and AI phases, and in `FRONTEND_PLAN.md` for the frontend phases. This section is the summary view across all three tracks.
>
> **Status:** the frontend has shipped, and the backend/AI work now runs as **one linear sequence — Phase 0 … Phase 20** (`BACKEND_AI_PLAN.md`), not in parallel. The wave groupings below remain as milestone framing; the execution order to follow is the phase order in that document.

### Wave 1 — Foundation and core surfaces

Runs fully in parallel across all three tracks.

- **FE-1 … FE-5** — shell, marketing, auth, dashboard, input flow
- **BE-1 … BE-5** — data layer, platform seams, auth + org, project + usage, input
- **AI-1 … AI-4** — LLM provider, tools, prompts, context

**Start order within the backend/AI track matters more here than anywhere else:** `BE-1 → BE-2 → (AI-1, AI-3, BE-3) → BE-4 → (AI-2, AI-4) → BE-5`. BE-2 unblocks AI-1 and AI-2, so it comes before everything except the schema itself.

**Milestone:** the app is navigable and demoable; the backend can persist a project; the agent can call a model and read files.

**Integration gates:** I-1, I-2

### Wave 2 — Specs and gates

- **FE-6 … FE-8** — approval gates, build view, workspace
- **BE-6 … BE-8** — spec, credential, version
- **AI-5** — spec generation (needs BE-6)

**Milestone:** a user can describe an app, receive four generated specs, approve them, and see a build view. The agent can generate specs.

**Integration gates:** I-3, I-4

### Wave 3 — Execution

- **BE-9 … BE-10** — execution, build orchestration, SSE
- **AI-6 … AI-8** — code generation, recovery, test agent

**Highest-risk wave.** Three AI phases wait on execution and streaming; a backend slip here stalls all three.

**Milestone:** approved specs become a running application with a live preview.

**Integration gates:** I-5, I-6, I-7

### Wave 4 — Delivery

- **FE-9 … FE-10** — deploy, settings, hardening
- **BE-11** — deploy, export, background jobs
- **AI-9** — change requests

**Milestone:** V1 is complete — build, deploy, export, iterate.

**Integration gate:** I-8

---

## 6. Phase document conventions

Every phase in every track uses the same structure:

```md
### FE-4: Dashboard

**Goal:** one sentence describing the outcome.
**Depends on:** FE-1, P0.4
**Deliverables:** files and features produced.
**Exit criteria:** checkable statements, never "works well".
**Tests:** what this phase adds, and what it deliberately does not test.
**Notes:** gotchas, decisions, references.
```

### Test policy (applies to all tracks)

- Every exported function in `packages/core/src/modules/**` has a test.
- Every component containing logic — branching, state, validation — has a test.
- **Not** unit-tested: shadcn/ui primitives, Tailwind classes, pure layout components.
- No coverage-percentage target. It rewards testing trivial code.
- Assertions on user-facing copy are deliberate, not incidental. The simplified-build panel, for example, is asserted to contain no error strings — that is a product requirement, not a snapshot accident.

### Definition of done

A phase is complete when:

1. All deliverables exist.
2. Every exit criterion is verifiably true.
3. Its tests pass and were written in the same phase, not deferred.
4. No new lint or type errors.
5. The `README` structure notes still describe reality.

---

## 7. Non-negotiables

These are repeated from `README.md` because they are the rules most likely to erode under schedule pressure.

1. **`packages/core` must not depend on `next`.** Routes read the session, build a `RequestContext`, call one service, and revalidate. **Enforced structurally** — `next` is not in the package's dependencies, so `next/*` cannot resolve from it. Do not add it "just for types".
2. **`packages/templates/` is data, not code.** Nothing type-checks or lints the skeleton. This is a property of the layout, not a rule to maintain — do not add the skeleton to a `tsconfig` to silence an editor warning.
3. **Conventions come from `template.json`, never from prompt strings.** This is what keeps a second template cheap.
4. **Prompts are files, diffable in pull requests.**
5. **`retrieve()` in `packages/core/src/modules/agent/context/` is the only context entry point.** Vector search later swaps the implementation, not the call sites.
6. **The user never sees a technical error.** Presentation may be simplified silently. Correctness — authorization, tenant isolation, money — may never be.
7. **Tokens come from `DESIGN.md`.** No hardcoded hex values in components.

---

## 8. Risk register

| Risk                                       | Impact                    | Mitigation                                                            |
| ------------------------------------------ | ------------------------- | --------------------------------------------------------------------- |
| Mock drift from real API                   | Integration rework        | Contracts in P0.4; MSW validates against them                         |
| RSC/TanStack ownership confusion           | Two sources of truth      | Ownership table in §2, applied per phase                              |
| `modules/` importing framework code        | Blocks worker extraction  | ESLint boundary rule from P0.1                                        |
| Silent degradation hiding correctness bugs | Security holes            | `recovery/rules.ts` policy in AI-7; explicit test assertions          |
| Dense UI screens (gates, workspace)        | Visual drift from design  | Screenshot diff in FE-10 against Stitch exports                       |
| LLM provider not chosen                    | Blocks AI-1 provider impl | Interface work is provider-agnostic; only routing map waits           |
| Test agent scope (AI-8)                    | Delays first ship         | Slot exists in the tree; deferring to V1.1 needs no structural change |

---

## 9. Open items

1. **Primary LLM provider not chosen** — Anthropic vs OpenAI. Partially resolved (2026-09-13): **mock-first is locked** — the interface, mock provider, and every downstream phase proceed offline; only the concrete provider and `router.ts` model names wait for an API key.
2. **"AI services agent" undefined** — carried from `PRDv2.md §12`. Three possible readings (generated apps using AI, KairoPro's own agent infrastructure, or a design-time decision about where generated apps call an LLM). Not in any phase until disambiguated.
3. **AI-8 (Test Agent) may be deferred to V1.1** — the most expensive purely-quality phase. Deferring removes no structural work. Confirm before Wave 3.
4. **Auth provider for the platform** — Google OAuth requires credentials before BE-3 can be tested against a real provider. Credentials-only dev works without them.
5. **Design token source divergence** (added 2026-09-13) — brand tokens are hand-written in `apps/web/src/app/globals.css`; `design:export` (P0.2) has never been run and `theme.css` does not exist. Either adopt DESIGN.md as the source and re-export, or amend P0.2 to bless `globals.css`. Blocks no backend phase; AI-5's design generation depends on DESIGN.md tooling working.

---

## 10. Verification checklist

Before declaring any wave complete:

- [ ] Every phase in the wave meets its exit criteria
- [ ] Tests exist for every phase in the wave and pass
- [ ] No phase's exit criteria are subjective
- [ ] Dependency graph in §4 matches the `Depends on` fields in the track documents
- [ ] No frontend phase has acquired a backend dependency
- [ ] `README.md` structure notes still match the repository
- [ ] Open items in §9 are current

# KairoPro

An AI-powered development platform. A user describes an application — or uploads a PRD, spec, or design file — and KairoPro generates a complete full-stack web app, runs it, tests it, fixes its own errors, and delivers a live preview they can deploy or export to GitHub.

> **Status: pre-implementation.** This repository currently contains product and architecture documentation plus the agreed directory structure. No application code has been written yet.

---

## Documentation

### Product and architecture

| File                    | Purpose                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRD.md`                | Product requirements — the original V1 definition                                                                                                                   |
| `PRDv2.md`              | **Supersedes `PRD.md` where they conflict.** Revised flow (PM agent, design system phase), agent-boundary decision, contract freezing, V1→V2 migration requirements |
| `TECHNICAL_DOCUMENT.md` | System architecture — HLD, schema, AI architecture, execution, security, scaling, cost, roadmap                                                                     |
| `DESIGN.md`             | The KairoPro design system, in the [DESIGN.md](https://github.com/google-labs-code/design.md) spec format. Lintable and exportable to Tailwind                      |
| `STITCH_PROMPTS.md`     | Google Stitch prompt pack — 27 screen prompts for marketing and application UI                                                                                      |

### Implementation plans

| File                          | Purpose                                                                                                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/IMPLEMENTATION_PLAN.md` | **Start here.** Master sequencing, dependency graph, wave plan, cross-track conventions, risk register                                                                     |
| `docs/FRONTEND_PLAN.md`       | FE-1 … FE-10 — shell, marketing, auth, dashboard, input, gates, build, workspace, deploy, hardening                                                                        |
| `docs/BACKEND_AI_PLAN.md`     | **Backend and AI together.** BE-1 … BE-11 and AI-1 … AI-9, organized by wave, with the 12 seams, stub-first strategy, ownership boundaries, and 8 integration gates inline |

**Reading order for a new contributor:** `PRDv2.md` → `TECHNICAL_DOCUMENT.md` → `docs/IMPLEMENTATION_PLAN.md` → `DESIGN.md`.

### Build order

The frontend is built first and is fully independent — MSW serves every endpoint from the shared contracts, so no frontend phase waits on the backend. Flipping MSW off is the integration step.

```
Phase 0  ── shared: toolchain · tokens · tests · contracts · MSW
             │
   ┌─────────┼──────────┐
   ▼         ▼          ▼
 FE-1..5   BE-1..5    AI-1..4     Wave 1
   ▼         ▼          ▼
 FE-6..8   BE-6..8    AI-5        Wave 2
   ▼         ▼          ▼
 FE-9..10  BE-9..11   AI-6..8     Wave 3
             │          │
             └────┬─────┘
                  ▼
                AI-9            Wave 4
```

---

## Structure

KairoPro is a **pnpm + Turborepo monorepo**. Five workspace projects:

```
kairopro/
├── apps/
│   └── web/            Next.js — routes, UI, React Server Components
├── packages/
│   ├── contracts/      Zod schemas. Isomorphic. Zero internal deps.
│   ├── db/             Prisma schema, client, migrations, seed
│   ├── core/           modules/ + platform/. Server-only. NO next.
│   └── templates/      Generated-app scaffolding. Data, not code.
├── designs/            Stitch exports + brand assets — reference, not source
├── docker/             KairoPro's own app image + local dev stack
├── docs/               Product, architecture, and phase plans
├── scripts/            Operational scripts (provision, cleanup, health)
└── tests/              Cross-package integration tests

pnpm-workspace.yaml  turbo.json  tsconfig.base.json  .env
```

**Dependencies flow one way:** `web → core → {contracts, db}`. `templates` is read at runtime, never compiled.

### `apps/web/`

Next.js routes, UI, and **session access**. A route handler validates input, authorizes, calls one service method, and returns. No business logic lives here.

```
apps/web/src/
├── app/              (marketing) · (auth) · (dashboard) · api/
│   └── (dashboard)/projects/
│       ├── new/      Input flow + agent questions
│       └── [id]/     spec/ (approval gates) · build/ · deploy/ · workspace
├── components/       ui/ · build/ · spec/ · project/ · marketing/ · auth/ · settings/ · common/
├── lib/              auth · request-context · queries · sse · validation · utils
├── stores/           Zustand — build, project, ui
└── middleware.ts
```

`apps/web` owns session access: it reads the NextAuth session, builds a `RequestContext`, and hands it to a service in `core`. `core` can never reach for `cookies()` itself.

### `packages/core/src/modules/`

Domain logic. **This package does not depend on `next`.**

The route reads the session and passes an explicit `RequestContext` down; revalidation happens in the route after the service returns. This is the single rule that makes lifting a module into a worker mechanical instead of archaeological — and it is enforced by the package graph, not by lint, so `next/*` cannot resolve from here.

```
modules/
├── project/          Projects, status transitions
├── org/              Organization, membership, access helpers
├── input/            Uploaded files, text, extraction
├── spec/             prd | data_model | app_structure | design
├── design/           Design system phase — tokens, lint, export
├── agent/            The core (see below)
├── build/            Build orchestration, SSE encoding
├── execution/        Container lifecycle, terminal, preview
├── version/          Git commits, history, diffs, revert
├── deploy/           Deployment, DNS, SSL, GitHub export
├── credential/       Encrypted third-party keys
└── usage/            Metering — LLM calls, builds, container-minutes
```

### `packages/core/src/modules/agent/`

The heart of the product, and where most of the real complexity lives.

```
agent/
├── workflow/         Deterministic orchestration
│   ├── engine.ts     Runs steps, halts at gates, writes checkpoints
│   ├── state.ts
│   └── steps/        pm-questions · generate-prd · generate-design
│                     generate-data-model · generate-app-structure
│                     freeze-contracts · generate-code
│                     run-tests · fix-loop · prepare-preview
├── phases/           Scoped generation *inside* generate-code
│   ├── backend.ts
│   ├── frontend.ts
│   └── test-authoring.ts    The one true agent boundary
├── llm/              provider.ts (interface) · router.ts (phase→model) · providers/
├── tools/            registry + file · search · exec · test · observe · browser
├── context/          retrieve.ts is THE seam — vector search swaps here
├── recovery/         fix-loop · degradation · rules.ts
└── prompts/          Versioned .md files, never string literals
```

**`workflow/steps/` vs `phases/`** — a _step_ is a unit of workflow with a gate and a checkpoint. A _phase_ is a scoped generation pass inside a step. Different lifetimes, so they don't share a directory.

**`recovery/rules.ts` is a policy file on purpose.** The degradable / never-degradable split is a decision, not logic: presentation complexity may be silently simplified, but authorization, tenant isolation, and money must never be. A reviewer should be able to read that file and see the policy.

### `packages/core/src/platform/`

Swappable infrastructure, each with an interface and one local implementation side by side. Moving to Redis or S3 later is a file swap, not a refactor.

```
platform/
├── db/           Prisma client singleton
├── events/       EventBus interface + LocalEventBus
├── workspace/    WorkspaceStore interface + LocalWorkspaceStore
├── container/    ContainerRuntime interface + DockerRuntime
├── crypto/       AES-256-GCM
├── logger/       Pino, structured JSON
└── jobs/         In-process scheduler (cleanup, health)
```

### `packages/templates/`

Scaffolding copied into a generated project's workspace. **Data, not code.**

```
packages/templates/nextjs-shadcn/
├── template.json    id, name, stack, conventions — machine-readable
└── skeleton/        Copied verbatim into the workspace
    ├── src/
    ├── prisma/
    ├── package.json     ← the GENERATED app's package.json
    └── tsconfig.json
```

`template.json` carries the conventions (`router: app`, `aliases: @/ → src/`, `validation: zod`). Per PRDv2 these are injected into agent context from here — never hardcoded into prompt strings. That is what keeps adding a second template (e.g. HeroUI) cheap.

**Nothing type-checks or lints the skeleton.** That is a property of the layout — no `tsconfig` references it — rather than a rule to remember. Do not add it to one to silence an editor warning.

### `designs/`

```
designs/
├── brand/          Source-of-truth brand assets (logo)
├── stitch/         Exported HTML/Tailwind, one folder per screen ID
└── screenshots/    Exported images, used for visual diffing after the port
```

`designs/brand/logo.svg` is the master mark. P0.1 copies it to `apps/web/public/logo.svg` and `apps/web/src/app/icon.svg`; those copies are build artifacts, not sources. Edit the master and re-copy — do not edit the copies.

Name Stitch export folders to match the screen IDs in `STITCH_PROMPTS.md` (`A1-home`, `B1-login`, `D1-gate-prd`, …).

**Stitch exports are reference, not source.** The source of truth for visual design is `DESIGN.md`; for the mark it is `designs/brand/logo.svg`. Port Stitch HTML to App Router components built on shadcn/ui primitives — do not port the React export, which brings its own styles and fights the token system.

---

## Design tokens

`DESIGN.md` is a real, lintable spec, not prose. It exports directly into the generated app's theme, which is what makes the design review phase affect the code rather than decorating it.

```bash
pnpm design:lint      # validates against the spec + WCAG contrast
pnpm design:export    # emits @theme CSS → apps/web/src/app/theme.css

# other formats, directly:
npx -p @google/design.md designmd export --format json-tailwind DESIGN.md > tailwind.theme.json
npx -p @google/design.md designmd export --format dtcg DESIGN.md > tokens.json
```

Tailwind v4 is CSS-first, so there is no `tailwind.config.ts` — the exported `@theme` block **is** the config. The design artifact and the build configuration are the same file.

---

## Non-negotiables

1. **`packages/core` must not depend on `next`.** Enforced structurally — `next` is not in the package's dependencies, so `next/*` cannot resolve. Do not add it "just for types".
2. **`packages/templates/` is data, not code.** Nothing type-checks or lints the skeleton; that is a property of the layout, not a rule to maintain.
3. **Conventions come from `template.json`, not from prompt strings.**
4. **Prompts are files, reviewable in PRs.**
5. **`retrieve()` in `packages/core/src/modules/agent/context/` is the only context entry point.**
6. **The user never sees a technical error.** Presentation may be simplified; correctness never is.

---

## Stack

**Platform** — pnpm workspaces + Turborepo · Next.js 16 (App Router) · TypeScript 7 · Tailwind v4 · PostgreSQL · Prisma 7 · NextAuth · shadcn/ui · TanStack Query · Zustand · Zod · SSE · Docker · Caddy

**Generated apps** — Next.js · TypeScript · PostgreSQL · Prisma · NextAuth · shadcn/ui · Zod

**Commands**

```bash
pnpm install          # links all 5 workspace projects
pnpm dev              # turbo — runs web + package watchers
pnpm build            # turbo — dependency-ordered, cached
pnpm test             # turbo — unit + integration
pnpm typecheck        # turbo — after ^build, so generated Prisma types exist
pnpm db:generate      # prisma generate → packages/db/src/generated/prisma
pnpm db:migrate       # prisma migrate dev
pnpm db:seed
pnpm design:export    # DESIGN.md → apps/web/src/app/theme.css
```

---

## Open items

- **Primary LLM provider not chosen** (Anthropic vs OpenAI). Blocks the model routing map and Phase 3.
- **"AI services agent" is undefined** — recorded as an open question in `PRDv2.md §12`. Three readings lead to different work.
- **V1 scope is larger than `PRD.md` describes** — PRDv2 added the PM agent, design phase, test agent, and contract freezing. The first ship may defer the test agent to V1.1.

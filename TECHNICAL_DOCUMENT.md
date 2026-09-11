# KairoPro — Technical Architecture Document

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Repository Structure](#2-repository-structure)
3. [Technology Stack](#3-technology-stack)
4. [Database Architecture](#4-database-architecture)
5. [AI Architecture](#5-ai-architecture)
6. [Agent Architecture](#6-agent-architecture)
7. [Workflow Engine](#7-workflow-engine)
8. [Code Generation Strategy](#8-code-generation-strategy)
9. [Context Management](#9-context-management)
10. [Execution Architecture](#10-execution-architecture)
11. [Sandbox Security](#11-sandbox-security)
12. [Real-Time Communication](#12-real-time-communication)
13. [Backend Architecture](#13-backend-architecture)
14. [Frontend Architecture](#14-frontend-architecture)
15. [API Design](#15-api-design)
16. [Version Control Strategy](#16-version-control-strategy)
17. [Preview and Deployment](#17-preview-and-deployment)
18. [Testing Strategy](#18-testing-strategy)
19. [Observability](#19-observability)
20. [Scalability Strategy](#20-scalability-strategy)
21. [Cost Model](#21-cost-model)
22. [Security](#22-security)
23. [Development Roadmap](#23-development-roadmap)

---

## 1. System Architecture

### 1.1 High-Level Design

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Input    │  │ Approval │  │ Preview  │  │ Deploy │  │
│  │ Flow     │  │ Flow     │  │ (iframe/ │  │ Flow   │  │
│  │          │  │          │  │  URL)    │  │        │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │  HTTPS + SSE
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 Next.js Application                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │              API Layer                              │ │
│  │   Route Handlers + Server Actions + Middleware      │ │
│  │   (Auth, Rate Limiting, Validation, Routing)        │ │
│  └───────┬──────────────┬──────────────┬──────────────┘ │
│          │              │              │                 │
│          ↓              ↓              ↓                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │ Project      │ │ Agent        │ │ Execution        │ │
│  │ Module       │ │ Module       │ │ Module           │ │
│  │              │ │              │ │                  │ │
│  │ - Projects   │ │ - Workflow   │ │ - Container Mgr  │ │
│  │ - Specs      │ │ - LLM Client │ │ - Orchestrator   │ │
│  │ - Versions   │ │ - Tools      │ │ - Resource Limits│ │
│  │ - Credentials│ │ - Context    │ │ - Health Monitor │ │
│  │ - Inputs     │ │ - Prompts    │ │ - Log Streaming  │ │
│  └──────┬───────┘ └──────┬───────┘ └────────┬─────────┘ │
│         │                │                  │            │
│  ┌──────┴────────────────┴──────────────────┴─────────┐ │
│  │            Event Bus (in-process)                  │ │
│  │      Pub/Sub for build events + log streams        │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────┘
                          │
      ┌───────────────────┼───────────────────┐
      ↓                   ↓                   ↓
┌───────────┐      ┌───────────┐      ┌───────────────┐
│PostgreSQL │      │  Docker   │      │  Filesystem   │
│(metadata) │      │  Engine   │      │ (git repos)   │
└───────────┘      └─────┬─────┘      └───────────────┘
                         │
                 ┌───────┴────────┐
                 ↓                ↓
          ┌─────────────┐  ┌─────────────┐
          │ App Container│  │  Postgres   │
          │ (Next.js)    │  │  Container  │
          └─────────────┘  └─────────────┘
```

### 1.2 Architectural Principles

1. **Single application, modular code (V1).** Not microservices. Modules communicate via direct function calls and an in-process event bus. This avoids network failure modes and deployment complexity while keeping boundaries clean for future extraction.

2. **The workflow is deterministic; the agent is flexible.** The sequence of phases is code, not LLM decisions. Within each phase, the LLM plans and executes using tools.

3. **The workspace is the source of truth.** Generated project files live on disk in a git repo. Everything else (DB metadata) is an index into that.

4. **Never expose failure to the user.** Errors are contained and logged internally; the user receives a working (possibly simplified) app.

5. **Everything is traceable.** Every mutation to a project is a git commit; every build is a record; every log line is persisted.

### 1.3 Request Lifecycle Types

| Lifecycle | Transport | Description |
|-----------|-----------|-------------|
| Standard CRUD | HTTP request/response | Project list, spec fetch, settings |
| Mutations | Server Actions | Create project, approve spec, save credentials |
| Long-running | HTTP + SSE | Build progress, terminal output, code stream |
| Background | Async worker (in-process queue) | Container provisioning, cleanup, health checks |

### 1.4 Environment Topology (V1)

```
┌──────────────────────────────────────────────────────┐
│                 Single Host (V1)                      │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Next.js App (KairoPro)                      │    │
│  │  - Port 3000 (internal)                      │    │
│  │  - Reverse proxy (Caddy/nginx) on 443        │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  PostgreSQL (KairoPro metadata)              │    │
│  │  - Port 5432 (internal only)                 │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Docker Engine                               │    │
│  │  - Per-project networks + containers         │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Reverse Proxy (Caddy)                       │    │
│  │  - kairopro.app → Next.js                    │    │
│  │  - *.preview.kairopro.dev → containers       │    │
│  │  - *.kairopro.app → deployed containers      │    │
│  │  - Automatic HTTPS (Let's Encrypt)           │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

Caddy is used as the reverse proxy because it handles automatic HTTPS and dynamic subdomain routing with minimal configuration. It watches the Docker engine for container labels and routes accordingly.

---

## 2. Repository Structure

KairoPro is a **pnpm + Turborepo monorepo**. The layout exists to make two boundaries structural rather than disciplinary: `core` cannot reach for Next.js APIs, and the generated-app template is never type-checked by our build.

```
kairopro/
├── apps/
│   └── web/                          # Next.js — routes, UI, RSC, session access
│       ├── src/
│       │   ├── app/                  # (marketing) · (auth) · (dashboard) · api/
│       │   ├── components/           # ui · build · spec · project · marketing
│       │   │                         # auth · settings · common
│       │   ├── lib/                  # auth · request-context · queries · sse
│       │   │                         # validation · utils
│       │   ├── stores/               # Zustand — build, project, ui
│       │   └── middleware.ts
│       ├── public/logo.svg
│       ├── next.config.ts
│       └── package.json              # deps: @kairopro/contracts, @kairopro/core
│
├── packages/
│   ├── contracts/                    # Zod schemas. Isomorphic. Zero internal deps.
│   │   └── src/                      # project · spec · build · input · credential
│   │                                 # version · usage · auth · question · errors
│   ├── db/                           # Prisma. Owns the schema and the client.
│   │   ├── prisma/                   # schema.prisma · migrations/ · seed.ts
│   │   ├── src/generated/prisma/     # generator output (gitignored)
│   │   ├── src/index.ts              # exports the client singleton
│   │   └── prisma.config.ts          # loads the root .env
│   ├── core/                         # Domain + platform. Server-only. NO next.
│   │   └── src/
│   │       ├── modules/              # project · org · input · spec · design
│   │       │                         # agent · build · execution · version
│   │       │                         # deploy · credential · usage
│   │       ├── platform/             # events · workspace · container · crypto
│   │       │                         # logger · jobs · db
│   │       └── lib/                  # errors.ts · context.ts
│   └── templates/                    # Generated-app scaffolding. Data, not code.
│       └── nextjs-shadcn/
│           ├── template.json         # id, stack, conventions — machine-readable
│           └── skeleton/             # copied verbatim into a project workspace
│
├── docs/                             # product · architecture · phase plans
├── designs/                          # brand/ · stitch/ · screenshots/
├── docker/                           # KairoPro's own image + dev stack
├── scripts/                          # provision · cleanup · health
└── tests/                            # cross-package integration tests

pnpm-workspace.yaml  turbo.json  tsconfig.base.json  .env
```

### 2.0.1 Dependency Graph

```
contracts   ← no internal deps
db          ← no internal deps
core        → contracts, db
web         → contracts, core
templates   ← standalone; read at runtime by core, never compiled
```

Dependencies flow one way. There are no cycles, and `turbo` builds in this order automatically.

### 2.0.2 Why the Boundaries Are Structural

Each of these is enforced by the build system rather than by convention, review, or a linter rule that can be disabled with a comment.

| Boundary | Enforced by |
|---|---|
| `core` cannot use Next.js APIs | `next` is not a dependency of `@kairopro/core`, so `next/*` fails to resolve |
| `contracts` cannot pull in server code | No internal dependencies, no Node built-ins — safe in a client bundle |
| The template is never type-checked | No `tsconfig` references `packages/templates/nextjs-shadcn/skeleton` |
| One database URL for app and migrations | A single root `.env`, loaded explicitly by `next.config.ts` and `prisma.config.ts` |

The first is the one that matters most. It is the difference between lifting a module into a background worker later and rewriting it — and unlike an ESLint rule, it cannot be silenced in a file that is under deadline pressure.

### 2.0.3 RequestContext Crosses the Boundary

```
packages/core/src/lib/context.ts      # DEFINES the interface
apps/web/src/lib/request-context.ts   # BUILDS it from the NextAuth session
```

Every route reads the session, builds a context, and passes it to one service method. `core` never calls `cookies()`.

### 2.1 Workspace Storage Layout (Server Filesystem)

```
/var/kairopro/
├── workspaces/
│   ├── {projectId}/
│   │   ├── .git/                         # Git repository
│   │   ├── src/                          # Generated project source
│   │   ├── prisma/
│   │   ├── docker-compose.yml            # Project runtime definition
│   │   ├── .env                          # Generated env (from credentials)
│   │   └── .kairopro/
│   │       ├── spec.json                 # Approved specs snapshot
│   │       ├── file-index.json           # File index for context
│   │       ├── summary.json              # Project summary
│   │       └── build.json                # Latest build record
│   └── ...
├── uploads/
│   └── {projectId}/
│       └── {inputId}-{filename}          # Raw uploaded input files
├── snapshots/
│   └── {projectId}/{timestamp}.tar.gz    # Optional build snapshots
└── logs/
    └── {projectId}/{buildId}.log         # Full build logs
```

---

## 3. Technology Stack

### 3.1 KairoPro Platform

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Repo layout | pnpm workspaces + Turborepo | Package boundaries enforced structurally; dependency-ordered, cached builds |
| Framework | Next.js 16 (App Router) | SSR, server components, route handlers, server actions, one codebase for FE+BE |
| Language | TypeScript 7 | Type safety across the stack; workspace packages ship raw TS, compiled by Next |
| UI Library | shadcn/ui | Source-in-repo components, Radix accessibility, Tailwind native, AI-modifiable |
| Styling | Tailwind CSS v4 | CSS-first `@theme` — the `DESIGN.md` export *is* the config; no JS config file |
| Server State | RSC + TanStack Query | RSC for first paint; TanStack for polling, mutations, pagination, invalidation |
| Client State | Zustand | Minimal, no boilerplate, ideal for high-frequency stream state |
| Validation | Zod | Runtime validation + type inference, shared across client, server, MSW, and AI output |
| ORM | Prisma 7 | Type-safe queries, declarative schema, migrations; `prisma-client` generator with explicit output path |
| Database | PostgreSQL 16 | JSONB for specs, mature, same DB as generated apps |
| Auth | NextAuth.js (Auth.js) | Email/password + Google OAuth, Next.js native, self-hosted |
| Realtime | Server-Sent Events | Simpler than WebSocket, auto-reconnect, HTTP-native, one-directional is enough |
| Editor | Monaco | VS Code editing experience, syntax highlighting |
| Containers | Docker + dockerode | Per-project isolation, mature tooling |
| Reverse Proxy | Caddy | Automatic HTTPS, Docker label routing, minimal config |
| Git | isomorphic-git or git CLI | Version control per project |
| LLM | Abstracted provider (Anthropic/OpenAI) | Swappable, multi-model |
| Encryption | Node crypto (AES-256-GCM) | Credential encryption at rest |
| Logging | Pino | Structured JSON logs |

### 3.2 Generated Application Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| UI Library | shadcn/ui |
| Styling | Tailwind CSS |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | NextAuth.js |
| Validation | Zod |
| Runtime | Node.js 20 |

### 3.3 Rejected Alternatives and Why

| Alternative | Rejected Because |
|-------------|-----------------|
| Microservices (V1) | Network failure modes, 3x deployment work, no scale justification at 10-50 users |
| Kubernetes (V1) | Massive operational overhead for single-host scale |
| Firecracker (V1) | Strong isolation but significant infra complexity; revisit at V3 |
| Redis (V1) | In-process pub/sub is sufficient for single host; add when multi-host |
| Vector DB (V1) | Projects are 20-40 files; keyword + dependency matching suffices |
| WebSockets (V1) | SSE covers one-directional streaming with less complexity |
| GraphQL | REST + server actions are simpler; no over-fetching problem at this scale |
| MongoDB | Relational data (projects→specs→versions) fits PostgreSQL better |
| Raw SQL | Prisma gives type safety and migrations with less AI error surface |

---

## 4. Database Architecture

### 4.1 KairoPro Schema (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String?
  image         String?
  accounts      Account[]
  sessions      Session[]
  projects      Project[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  type              String
  provider          String
  providerAccountId String
  refreshToken      String? @db.Text
  accessToken       String? @db.Text
  expiresAt         Int?
  tokenType         String?
  scope             String?
  idToken           String? @db.Text

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expires      DateTime
}

model Project {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  description String?  @db.Text
  status      ProjectStatus @default(DRAFT)
  techStack   Json?
  workspacePath String
  previewUrl  String?
  previewSubdomain String? @unique
  deployedUrl String?
  deploySubdomain String? @unique
  inputs      Input[]
  specs       Spec[]
  versions    Version[]
  credentials Credential[]
  builds      Build[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

enum ProjectStatus {
  DRAFT
  SPECIFYING
  BUILDING
  READY
  DEPLOYED
  ERROR
}

model Input {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  type      InputType
  content   String   @db.Text          // text content or file path
  filename  String?
  mimeType  String?
  size      Int?
  createdAt DateTime @default(now())

  @@index([projectId])
}

enum InputType {
  TEXT
  FILE
  SCREENSHOT
}

model Spec {
  id        String     @id @default(cuid())
  projectId String
  project   Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  type      SpecType
  content   Json                        // structured spec document
  status    SpecStatus @default(PENDING)
  version   Int        @default(1)
  feedback  Json?                       // revision history
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@unique([projectId, type, version])
  @@index([projectId, type])
}

enum SpecType {
  PRD
  DATA_MODEL
  APP_STRUCTURE
}

enum SpecStatus {
  PENDING
  APPROVED
  REJECTED
  STALE          // upstream spec changed, needs re-approval
}

model Version {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  commitHash String
  message    String
  diff       String?  @db.Text
  filesChanged Int    @default(0)
  createdBy  String                    // 'user' | 'agent'
  createdAt  DateTime @default(now())

  @@index([projectId])
}

model Credential {
  id           String   @id @default(cuid())
  projectId    String
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  serviceName  String                   // 'google_oauth', 'stripe', etc.
  encryptedData String  @db.Text        // AES-256-GCM encrypted JSON
  iv           String
  authTag      String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([projectId, serviceName])
}

model Build {
  id            String      @id @default(cuid())
  projectId     String
  project       Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  status        BuildStatus @default(PENDING)
  currentStep   String?
  steps         Json                    // step states
  checkpoint    Json?                   // cancel checkpoint data
  startedAt     DateTime    @default(now())
  completedAt   DateTime?
  cancelRequested Boolean   @default(false)
  error         String?     @db.Text    // internal only, never shown to user

  @@index([projectId])
}

enum BuildStatus {
  PENDING
  BUILDING
  READY
  PARTIAL     // completed with simplifications
  CANCELLED
  ERROR
}

model BuildLog {
  id        String      @id @default(cuid())
  buildId   String
  build     Build       @relation(fields: [buildId], references: [id], onDelete: Cascade)
  type      BuildLogType
  content   String      @db.Text
  seq       Int                         // monotonic sequence for SSE resume
  timestamp DateTime    @default(now())

  @@index([buildId, seq])
}

enum BuildLogType {
  STATUS
  TERMINAL
  CODE
}

model InternalError {
  id         String   @id @default(cuid())
  projectId  String?
  buildId    String?
  step       String
  errorType  String
  message    String   @db.Text
  stack      String?  @db.Text
  file       String?
  attempt    Int?
  approach   String?
  resolved   Boolean  @default(false)
  resolution String?
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([buildId])
  @@index([createdAt])
}
```

### 4.2 Entity Relationships

```
User 1───N Project
User 1───N Account
User 1───N Session
Project 1───N Input
Project 1───N Spec
Project 1───N Version
Project 1───N Credential
Project 1───N Build
Build 1───N BuildLog
```

### 4.3 Key Design Decisions

**Specs as JSONB:** Specs are structured documents (feature lists, entity definitions, route tables), not free text. JSONB allows querying (e.g., "all specs requiring Google OAuth") and schema validation at the application layer.

**Spec versioning:** Each spec type has a `version` field. When a spec is revised, a new row is inserted (old versions retained). The `@@unique([projectId, type, version])` constraint enforces this. The approval flow always operates on the latest version.

**Spec staleness:** When an upstream spec is changed (PRD after Data Model approved), downstream specs are marked `STALE`. This forces re-approval and keeps the pipeline consistent.

**Credentials:** Stored per-project, encrypted with AES-256-GCM. The `iv` and `authTag` are stored separately. Decryption happens only at container provisioning time, and decrypted values exist only in memory long enough to write the container's `.env`.

**BuildLog sequence numbers:** Each log entry has a monotonic `seq` per build. This enables SSE resume: the client sends `Last-Event-ID`, the server replays from `seq + 1`. Without this, a reconnecting client loses events.

**InternalError table:** All errors the AI encounters are logged here with full context. This is the debugging surface for the KairoPro team — the user never sees it. The `resolved`/`resolution` fields let us measure how often graceful degradation succeeded.

### 4.4 Indexes

Critical indexes beyond primary keys:

- `Project(userId)` — dashboard listing
- `Project(status)` — background job filtering (e.g., cleanup inactive)
- `Spec(projectId, type)` — approval flow lookups
- `Version(projectId)` — history panel
- `BuildLog(buildId, seq)` — SSE streaming and replay
- `InternalError(createdAt)` — error dashboard time-range queries

### 4.5 Connection Management

Prisma client is instantiated as a singleton (module-level) to avoid connection pool exhaustion during Next.js hot reloads. In production, pool size is configured to `(2 × CPU cores) + effective_spindle_count`, typically 10-20 for a single host.

---

## 5. AI Architecture

### 5.1 Model Overview

**Workflow + Agent.** A deterministic workflow engine drives the phases. Each phase runs an agent loop (LLM + tools + observations) that iterates until the phase completes or the recovery budget is exhausted.

```
┌─────────────────────────────────────────────────────────┐
│                    Workflow Engine                        │
│                                                          │
│   ┌────────────┐   ┌────────────┐   ┌────────────┐      │
│   │ Generate   │──▶│ Generate   │──▶│ Generate   │      │
│   │ PRD        │   │ Data Model │   │ App Struct │      │
│   └────────────┘   └────────────┘   └────────────┘      │
│         │                │                │              │
│         ▼                ▼                ▼              │
│    [user approval]  [user approval]  [user approval]     │
│                                                          │
│   ┌────────────────────────────────────────────────┐    │
│   │  Generate Code                                  │    │
│   │    scaffold → schema → api → pages → auth       │    │
│   └────────────────────────────────────────────────┘    │
│         │                                                │
│         ▼                                                │
│   ┌────────────────────────────────────────────────┐    │
│   │  Run & Test  ◀──┐                               │    │
│   │    build → run → observe → fix loop ────────────┘   │
│   └────────────────────────────────────────────────┘    │
│         │                                                │
│         ▼                                                │
│   ┌────────────────────────────────────────────────┐    │
│   │  Prepare Preview (deterministic)                │    │
│   └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Why workflow + agent, not pure multi-agent:**

- A pipeline of specialized agents (Requirement Agent → Planning Agent → Coding Agent…) loses context at every handoff. Agent 4 doesn't know what Agent 1 decided, and reconstructing that state is harder than the work itself.
- A pure single-agent loop has no structure — it can't reliably stop for user approval, and it drifts on long tasks.
- The workflow gives us deterministic control points (approval gates, phase boundaries, checkpointing). The agent gives us flexibility within each phase. This is the right split.

### 5.2 Agent Loop

Within a phase, the agent runs a standard ReAct-style loop:

```
┌───────────────────────────────────────────────────┐
│ 1. Assemble context                                │
│    - system prompt (phase-specific)                │
│    - project summary                               │
│    - relevant files / approved upstream specs      │
│    - observations so far                           │
│                                                    │
│ 2. Call LLM with tool definitions                  │
│                                                    │
│ 3. Parse response                                  │
│    - if tool call → execute tool, append result    │
│    - if final answer → phase complete              │
│                                                    │
│ 4. Check budgets                                   │
│    - max iterations per phase: 25                  │
│    - max tokens per phase: configured              │
│    - max wall-clock per phase: configured          │
│                                                    │
│ 5. Repeat until complete or budget exhausted       │
└───────────────────────────────────────────────────┘
```

### 5.3 LLM Provider Interface

```typescript
interface LLMProvider {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterable<CompletionChunk>;
}

interface CompletionRequest {
  messages: Message[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  jsonSchema?: object;
}

interface CompletionResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: { inputTokens: number; outputTokens: number };
  stopReason: 'end' | 'tool_use' | 'max_tokens';
}
```

**Provider router:** Selects provider/model per task based on a static configuration map:

```typescript
const MODEL_MAP = {
  'prd':            { provider: 'anthropic', model: 'claude-sonnet' },
  'data-model':     { provider: 'anthropic', model: 'claude-sonnet' },
  'app-structure':  { provider: 'anthropic', model: 'claude-sonnet' },
  'code-gen':       { provider: 'anthropic', model: 'claude-sonnet' },
  'fix':            { provider: 'anthropic', model: 'claude-sonnet' },
  'summarize':      { provider: 'anthropic', model: 'claude-haiku' },
};
```

This map is the single place to change model routing. V2 replaces static routing with cost/latency-aware routing.

### 5.4 Structured Output

For spec generation, the LLM is forced to return JSON matching a Zod schema. This eliminates parsing failures and guarantees the spec is well-formed before it reaches the database.

```
Zod schema ──▶ JSON Schema ──▶ LLM tool definition
                                        │
                                        ▼
                              LLM returns structured JSON
                                        │
                                        ▼
                              Zod validates ──▶ store
                                        │
                                   invalid?
                                        ▼
                              Retry with error feedback
```

### 5.5 Prompt Architecture

Prompts are versioned files (`prompts/*.md`), not string literals. Each phase prompt has:

- **Role** — who the AI is acting as
- **Objective** — what this phase must produce
- **Inputs** — what upstream context is provided
- **Constraints** — tech stack, conventions, forbidden patterns
- **Output format** — exact shape required
- **Examples** — few-shot examples where valuable

The system prompt is stable across phases; phase prompts are composed on top.

### 5.6 Token and Cost Control

- **Prompt caching** — stable prefixes (system prompt, template conventions) are cached by the provider where supported
- **Context budgeting** — the context builder has a hard token budget; it drops least-relevant files rather than overflowing
- **Model tiering** — summarization and file-indexing use a cheaper model
- **Streaming** — responses stream so the UI shows progress and long generations remain responsive

---

## 6. Agent Architecture

### 6.1 Tool Registry

Tools are the agent's interface to the world. Each tool has a typed schema (Zod), a handler, and an execution context bound to a specific project workspace and container.

```typescript
interface Tool<TInput, TOutput> {
  name: string;
  description: string;
  schema: ZodSchema<TInput>;
  handler: (input: TInput, ctx: ToolContext) => Promise<TOutput>;
}

interface ToolContext {
  projectId: string;
  buildId: string;
  workspacePath: string;   // /var/kairopro/workspaces/{projectId}
  containerId?: string;    // running app container, if any
  emit: (event: BuildEvent) => void;   // stream to SSE
}
```

### 6.2 Tool Catalog

**File Tools**

| Tool | Input | Output | Notes |
|------|-------|--------|-------|
| `read_file` | `{ path, offset?, limit? }` | file content | Path validated inside workspace |
| `write_file` | `{ path, content }` | `{ ok, bytesWritten }` | Creates parent dirs |
| `edit_file` | `{ path, oldString, newString, replaceAll? }` | `{ ok, replacements }` | Exact-match replacement |
| `delete_file` | `{ path }` | `{ ok }` | Refuses paths outside workspace |
| `list_files` | `{ path?, glob? }` | `{ files: string[] }` | Respects .gitignore |

**Search Tools**

| Tool | Input | Output | Notes |
|------|-------|--------|-------|
| `search_code` | `{ pattern, glob?, maxResults? }` | `{ matches: Match[] }` | Regex search via ripgrep-equivalent |
| `find_symbol` | `{ name }` | `{ locations: Location[] }` | AST-aware symbol lookup |

**Dependency Tools**

| Tool | Input | Output | Notes |
|------|-------|--------|-------|
| `install_dependency` | `{ package, dev? }` | `{ ok, log }` | Runs inside container |

**Execution Tools**

| Tool | Input | Output | Notes |
|------|-------|--------|-------|
| `run_command` | `{ command, cwd?, timeoutMs? }` | `{ exitCode, stdout, stderr }` | Runs inside container, timeout enforced |
| `start_server` | `{ command, port }` | `{ pid, port, url }` | Background process in container |
| `stop_server` | `{ pid }` | `{ ok }` | Kills background process |

**Test Tools**

| Tool | Input | Output | Notes |
|------|-------|--------|-------|
| `run_tests` | `{ command? }` | `{ passed, failed, output }` | Defaults to project test command |

**Observation Tools**

| Tool | Input | Output | Notes |
|------|-------|--------|-------|
| `read_logs` | `{ source, lines? }` | `{ lines: string[] }` | Container or app logs |
| `inspect_error` | `{ log: string }` | `{ type, message, file, line, hint }` | Parses and classifies errors |

**Browser Tools**

| Tool | Input | Output | Notes |
|------|-------|--------|-------|
| `open_browser` | `{ url }` | `{ session }` | Headless browser session |
| `take_screenshot` | `{ selector? }` | `{ image }` | Screenshot as base64 |
| `click` | `{ selector }` | `{ ok }` | Headless interaction |
| `type_text` | `{ selector, text }` | `{ ok }` | Headless interaction |

### 6.3 Tool Safety

- **Path confinement:** Every file path is resolved and verified to be inside `workspacePath`. Symlinks are resolved before the check. `..` traversal is rejected.
- **Command confinement:** `run_command` executes inside the project container, never on the host. Destructive patterns (`rm -rf /`, fork bombs) are blocked by a denylist as a defense-in-depth measure.
- **Timeout enforcement:** Every tool has a hard timeout. A hung command cannot stall a build indefinitely.
- **Output truncation:** Tool outputs are truncated (head + tail) before being returned to the LLM to prevent context blowout from massive logs.

### 6.4 Agent Context Assembly

The agent never receives the whole project. Context is assembled per call:

```
┌─────────────────────────────────────────────┐
│ System Prompt (phase-specific)              │  ~2-4k tokens
├─────────────────────────────────────────────┤
│ Project Summary                             │  ~500 tokens
├─────────────────────────────────────────────┤
│ Approved Upstream Specs                     │  ~1-3k tokens
├─────────────────────────────────────────────┤
│ Relevant Files (from context builder)       │  ~4-20k tokens
├─────────────────────────────────────────────┤
│ Tool Observations (so far this phase)       │  variable
├─────────────────────────────────────────────┤
│ Task Instruction                            │  ~200 tokens
└─────────────────────────────────────────────┘
```

---

## 7. Workflow Engine

### 7.1 Workflow States

```
DRAFT
  │
  ▼
GENERATING_PRD ──awaiting approval──▶ PRD_APPROVED
  │                          │
  │ (user feedback)          │
  ◀──────────────────────────┘
  │
  ▼
GENERATING_DATA_MODEL ──awaiting approval──▶ DATA_MODEL_APPROVED
  │
  ▼
GENERATING_APP_STRUCTURE ──awaiting approval──▶ APP_STRUCTURE_APPROVED
  │
  ▼
BUILDING
  ├── SCAFFOLDING
  ├── GENERATING_SCHEMA
  ├── GENERATING_API
  ├── GENERATING_PAGES
  ├── CONFIGURING_AUTH
  ├── BUILDING_AND_TESTING  ◀── fix loop
  └── PREPARING_PREVIEW
  │
  ▼
READY
  │
  ▼
DEPLOYED
```

### 7.2 Workflow Step Interface

```typescript
interface WorkflowStep {
  name: string;
  run(ctx: WorkflowContext): Promise<StepResult>;
  canCancel: boolean;
  checkpoint?(ctx: WorkflowContext): Promise<CheckpointData>;
}

interface StepResult {
  status: 'complete' | 'needs_approval' | 'failed';
  output?: unknown;
  simplifications?: Simplification[];   // features that were simplified
}
```

### 7.3 Approval Gates

Approval gates are not agent-driven — they're explicit workflow states. When a spec generation step completes, the workflow moves to an `awaiting_approval` state and halts. The workflow resumes only when the user submits an approval action.

This is implemented as: the build/generation is not a long-lived process. Each spec is an independent agent run triggered by an HTTP request:

```
POST /api/projects/:id/specs/generate { type: 'PRD' }
  → runs agent for PRD
  → stores Spec(status=PENDING)
  → returns

POST /api/projects/:id/specs/:id/approve
  → sets Spec(status=APPROVED)
  → if all upstream approved, enables next generation

POST /api/projects/:id/build
  → runs the full build workflow (long-running)
  → streams via SSE
```

This design avoids keeping processes alive across approval waits.

### 7.4 Cancel with Checkpoint

The build workflow checks `Build.cancelRequested` at every step boundary and, within the code-generation step, after every file write. When set:

1. Current atomic operation completes (a file write, one tool call)
2. Checkpoint data is stored: which files are done, which step, which sub-items remain
3. `Build.status = CANCELLED`
4. Workspace is left in a consistent state (no half-written files)
5. Git commit is made: "Checkpoint: build cancelled at {step}"

Resuming reads the checkpoint and continues from the next unit of work.

```typescript
interface CheckpointData {
  step: string;
  completedFiles: string[];
  remainingFiles: string[];
  completedSubSteps: string[];
  specSnapshot: object;
}
```

### 7.5 Event Emission

Every meaningful action emits an event through the in-process event bus, which the SSE handler subscribes to:

```typescript
type BuildEvent =
  | { type: 'status'; step: string; state: 'pending'|'in_progress'|'complete'|'error' }
  | { type: 'terminal'; content: string }
  | { type: 'code'; file: string; content: string }
  | { type: 'simplification'; feature: string; reason: string };  // internal; user-facing copy derived separately
```

Events are persisted as `BuildLog` rows with a per-build sequence number so reconnecting clients can resume.

---

## 8. Code Generation Strategy

### 8.1 Hybrid Approach

**Template (fixed, ~20-25% of the final app):**

- Next.js App Router structure
- NextAuth setup with credentials + Google provider
- Prisma client singleton
- shadcn/ui components
- Layout shell (sidebar, header, responsive nav)
- Middleware (auth protection)
- Utility functions (cn, formatting, fetchers)
- Docker configuration

**AI-generated (~75-80% of the final app):**

- Prisma schema (from approved Data Model)
- API route handlers (from approved App Structure)
- Page components (from approved App Structure)
- Form components with Zod validation
- Business logic from the PRD
- Relationships, queries, and mutations
- Seed data

### 8.2 Generation Order

Order matters — each stage depends on the previous:

```
1. Copy template into workspace (fresh git repo, initial commit)
        │
2. Write prisma/schema.prisma from approved Data Model
        │
3. Run `prisma generate` + `prisma migrate dev`
        │  → validates schema, creates DB tables
        │
4. For each API endpoint in approved App Structure:
     4a. Generate route handler
     4b. Run type check on that file
     4c. If errors → fix loop (max 3)
        │
5. For each page in approved App Structure:
     5a. Generate page component
     5b. Generate any required child components
     5c. Run type check
     5d. If errors → fix loop (max 3)
        │
6. Configure auth providers from collected credentials
        │
7. Generate seed data (if PRD implies initial data)
        │
8. Full build: `npm run build`
      → type check whole project
      → if errors → fix loop
        │
9. Start server, verify HTTP 200 on root
        │
10. Run smoke tests / browser checks
        │
11. Commit: "Initial project build"
```

### 8.3 Why Generate One File at a Time

If the AI generates 30 files in one shot and 5 have errors, diagnosing and fixing them is exponentially harder — errors compound and the context is enormous. Generating one file, type-checking it, and fixing before moving on keeps failures local and small.

The trade-off is more LLM round-trips (cost, latency), which is acceptable for reliability. Type checking is fast and cheap relative to a failed whole-project build.

### 8.4 File Generation Prompt Contract

Each file-generation call receives:

- The approved Data Model (so the file uses correct types/fields)
- The relevant slice of the approved App Structure
- The template's conventions (import style, component patterns, file naming)
- The list of already-generated files (so imports reference real paths)

And must return a single file's content. This tight scope reduces hallucinated imports and mismatched APIs.

### 8.5 Consistency Enforcement

Generated code must match the template's conventions. Enforced by:

- **ESLint + Prettier** committed to the template; generated code is linted and auto-fixed
- **A conventions block** in the code-gen prompt: import aliases (`@/`), server vs. client component markers (`'use client'`), file naming (kebab-case files, PascalCase components)
- **Type checking** at every step — TypeScript catches most consistency errors immediately
- **A shared types file** for domain types used across API and UI

---

## 9. Context Management

### 9.1 The Problem

Projects range from ~20 to (eventually) hundreds of files. Sending everything to the LLM is:

- Expensive (paying for tokens we don't need)
- Slow (latency scales with input)
- Counterproductive (irrelevant context degrades output quality)

We need to select the *smallest set of files that lets the agent do the task correctly*.

### 9.2 V1 Context Strategy

**Three layers:**

**Layer 1 — Project Summary (always included):**

Generated when the project is built, updated when the structure changes.

```json
{
  "name": "TaskManager",
  "purpose": "Task management for small teams",
  "stack": ["next.js", "postgresql", "prisma", "shadcn-ui", "nextauth"],
  "auth": { "providers": ["credentials", "google"], "roles": ["ADMIN", "MANAGER", "MEMBER"] },
  "models": [
    { "name": "User", "fields": ["id", "email", "name", "role", "teamId"] },
    { "name": "Team", "fields": ["id", "name"] },
    { "name": "Task", "fields": ["id", "title", "status", "priority", "assigneeId", "teamId"] }
  ],
  "pages": ["/dashboard", "/tasks", "/tasks/new", "/tasks/[id]", "/team", "/settings"],
  "apiRoutes": ["/api/tasks", "/api/team", "/api/auth"],
  "conventions": {
    "router": "app",
    "components": "server-first",
    "validation": "zod",
    "aliases": "@/ → src/"
  }
}
```

**Layer 2 — File Index (used for retrieval):**

```json
{
  "prisma/schema.prisma": {
    "purpose": "Database schema",
    "exports": ["User", "Team", "Task", "Role", "Status", "Priority"],
    "tags": ["database", "schema", "models"]
  },
  "src/app/api/tasks/route.ts": {
    "purpose": "Tasks CRUD API",
    "exports": ["GET", "POST"],
    "imports": ["@/lib/prisma", "@/lib/auth"],
    "tags": ["api", "tasks", "crud"]
  }
}
```

**Layer 3 — Dependency Graph (used for expansion):**

```
prisma/schema.prisma
   ├── imported by: src/lib/prisma.ts
   │                    └── imported by: every API route
   └── referenced by: src/app/api/tasks/route.ts
                       src/app/tasks/page.tsx
                       src/components/TaskForm.tsx
```

### 9.3 Retrieval Algorithm (V1)

```
Input: change request text
   │
   ├─ 1. Extract keywords + entity names
   │     e.g. "add deadline field to tasks" → [deadline, tasks, Task]
   │
   ├─ 2. Match against file index (tags, purpose, exports)
   │     → candidate files: schema.prisma, api/tasks/route.ts,
   │       tasks/page.tsx, TaskForm.tsx, TaskCard.tsx
   │
   ├─ 3. Expand via dependency graph
   │     → adding a field to schema.prisma means
   │       downstream: prisma client types, API routes, forms
   │
   ├─ 4. Always include: project summary + schema + conventions
   │
   ├─ 5. Rank by relevance, take top N within token budget
   │
   └─ 6. Return file set
```

### 9.4 Token Budgeting

The context builder enforces a hard budget:

```
Total budget: 60k tokens (configurable)
  ├── system prompt:      4k
  ├── project summary:    1k
  ├── approved specs:     6k
  ├── relevant files:    40k
  ├── observations:       8k
  └── reserve:            1k
```

If relevant files exceed the budget, files are dropped by ascending relevance score. Any file dropped is noted so the agent knows it's working with partial context.

### 9.5 V2 — Vector Search

When projects grow beyond what keyword + dependency matching handles:

- Enable `pgvector` on PostgreSQL
- Embed each file's purpose + content + signature (chunked if large)
- Store embeddings in a `FileEmbedding` table
- Retrieve by cosine similarity, then expand via dependency graph
- Combine with keyword matching (hybrid retrieval)

This is additive: the file index and dependency graph remain, vector search just improves the initial candidate set.

---

## 10. Execution Architecture

### 10.1 Per-Project Runtime

Each project gets an isolated Docker network and two containers:

```
┌─────────────────────────────────────────────────┐
│  Project Network: kairopro-{projectId}          │
│                                                  │
│  ┌────────────────────┐    ┌──────────────────┐ │
│  │  app               │    │  db              │ │
│  │  node:20           │    │  postgres:16     │ │
│  │  next.js build     │───▶│  volume: pgdata  │ │
│  │  port 3000         │    │  port 5432       │ │
│  └────────────────────┘    └──────────────────┘ │
│         │                                        │
│         └── labels for Caddy routing             │
└─────────────────────────────────────────────────┘
```

### 10.2 docker-compose Template

The AI does not generate this — it's part of the template. Per-project values are injected:

```yaml
services:
  app:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/app
      NEXTAUTH_URL: ${PREVIEW_URL}
      NEXTAUTH_SECRET: ${GENERATED_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    depends_on:
      db:
        condition: service_healthy
    labels:
      caddy: ${PREVIEW_SUBDOMAIN}.preview.kairopro.dev
      caddy.reverse_proxy: "{{upstreams 3000}}"
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1024M

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 10
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

volumes:
  pgdata:
```

### 10.3 Container Lifecycle

```
provision(projectId)
  ├── create network kairopro-{projectId}
  ├── copy workspace → build context
  ├── write .env from decrypted credentials
  ├── docker compose up -d --build
  ├── wait for db healthy
  ├── run migrations (docker exec app npx prisma migrate deploy)
  ├── wait for app responding (HTTP 200 on /)
  └── return { previewUrl }

health(projectId)
  ├── inspect containers
  └── HTTP GET on app root

stop(projectId)
  ├── docker compose down
  └── keep volumes + network (for restart)

destroy(projectId)
  ├── docker compose down -v
  └── remove network
```

### 10.4 Commands Inside the Container

The agent's `run_command` tool executes via the Docker API (`docker exec`), not on the host:

```
run_command(projectId, "npm install")
  → container.exec({ Cmd: ["sh", "-lc", "npm install"], ... })
  → stream stdout/stderr → terminal events
  → return exit code + output
```

This is the isolation boundary: even if the agent generates a malicious command, it runs inside the project container with resource limits and network isolation, not on the host.

### 10.5 Terminal Streaming

Terminal output is streamed, not buffered, so the UI shows progress:

```
Container stdout ──▶ Docker exec stream ──▶ line splitter
                                              │
                                              ├──▶ BuildLog(type=TERMINAL)
                                              └──▶ BuildEvent(type=terminal) ──▶ SSE
```

### 10.6 Resource Management

- **Per-container limits:** app 1 CPU / 1GB, db 0.5 CPU / 512MB (configurable)
- **Per-project disk quota:** enforced via volume size limits or periodic checks
- **Inactivity cleanup:** a background job stops containers idle for > 2 hours (preview); deployed apps stay up
- **Orphan cleanup:** containers/networks with no matching project row are removed

### 10.7 Local Dev vs. Production

For local development, the same Docker API is used but pointed at the developer's Docker daemon. For production, the daemon runs on the host and the KairoPro app has access to the Docker socket (see security section).

---

## 11. Sandbox Security

### 11.1 Threat Model

The generated code is untrusted. It comes from an LLM, it may contain arbitrary logic, and in the future, users may edit it directly. We must assume the code could:

- Attempt to read other projects' files
- Attempt to access the host filesystem or Docker socket
- Attempt to exfiltrate credentials
- Consume unbounded CPU/memory/disk (accidental or malicious)
- Open unexpected network connections

### 11.2 V1 Isolation Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Host                                                    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  KairoPro App (trusted)                             │ │
│  │  - talks to Docker socket                           │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │  Project A container │  │  Project B container     │ │
│  │  ┌────────────────┐  │  │  ┌────────────────┐      │ │
│  │  │ app (isolated) │  │  │  │ app (isolated) │      │ │
│  │  └────────────────┘  │  │  └────────────────┘      │ │
│  │  ┌────────────────┐  │  │  ┌────────────────┐      │ │
│  │  │ db (isolated)  │  │  │  │ db (isolated)  │      │ │
│  │  └────────────────┘  │  │  └────────────────┘      │ │
│  │  Network A (own)     │  │  Network B (own)         │ │
│  └──────────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 11.3 Isolation Mechanisms (V1)

| Concern | Mechanism |
|---------|-----------|
| Process isolation | Each project in its own container, non-root user inside |
| Filesystem isolation | Container filesystem; only its workspace is mounted |
| Network isolation | Per-project Docker network; no cross-project communication |
| Resource limits | cgroup limits on CPU and memory |
| Privilege | Containers run non-root, no `--privileged`, no host mounts |
| Host access | No access to the Docker socket from project containers |
| Credentials | Only that project's env vars are injected |

### 11.4 What V1 Isolation Is NOT

Docker containers share the host kernel. A kernel exploit could theoretically escape a container. This is an acceptable risk for V1 because:

- The primary user is a developer using their own code
- There is no adversarial attacker in the V1 threat model
- The attack surface (generated web app code) is far from a kernel exploit

### 11.5 V1 Hardening Measures

Even with acceptable risk, we apply defense in depth:

- **Non-root inside containers** — the app runs as a non-root user
- **Read-only root filesystem** where possible (writable only the workspace and tmp)
- **`no-new-privileges`** security option
- **Command denylist** in `run_command` (block `rm -rf /`, `mkfs`, etc.)
- **Egress restrictions (V2)** — limit outbound network to package registries
- **Seccomp profile** — default Docker profile, restrictive
- **No host network mode** — never `--network host`

### 11.6 V3 — MicroVM Isolation

When opening to non-technical users and public URLs, upgrade to Firecracker microVMs:

- Each project runs in a lightweight VM with its own kernel
- Kernel exploits no longer grant host access
- Sub-second boot times preserve the UX
- Stronger CPU/memory/disk isolation

This is a significant infrastructure change and is explicitly postponed.

---

## 12. Real-Time Communication

### 12.1 SSE Architecture

```
┌──────────────────────────────────────────────────────┐
│  Agent / Execution                                     │
│    emit(event)                                        │
│         │                                             │
│         ▼                                             │
│  ┌─────────────────────────────────────────────┐     │
│  │  Event Bus (in-process EventEmitter)         │     │
│  │  channel: build:{buildId}                     │     │
│  └───────────────┬─────────────────────────────┘     │
│                  │                                    │
│                  ▼                                    │
│  ┌─────────────────────────────────────────────┐     │
│  │  BuildLog writer (persist with seq)          │     │
│  └───────────────┬─────────────────────────────┘     │
│                  │                                    │
│                  ▼                                    │
│  ┌─────────────────────────────────────────────┐     │
│  │  SSE Route Handler                            │     │
│  │  GET /api/projects/:id/builds/stream          │     │
│  │  - subscribes to event bus                    │     │
│  │  - replays from Last-Event-ID                 │     │
│  │  - writes events as SSE frames                │     │
│  └───────────────┬─────────────────────────────┘     │
│                  │                                    │
│                  ▼                                    │
│              Browser (EventSource)                    │
└──────────────────────────────────────────────────────┘
```

### 12.2 SSE Frame Format

```
id: 42
event: terminal
data: {"content":"Running: npm install\n"}

id: 43
event: code
data: {"file":"src/app/api/tasks/route.ts","content":"export async function GET() {"}

id: 44
event: status
data: {"step":"creating_api_routes","state":"complete"}
```

### 12.3 Reconnection and Resume

```
Client connects: GET .../stream?lastEventId=0
  → server sends events with seq > lastEventId
  → client stores last id
  → connection drops
Client reconnects: GET .../stream?lastEventId=44
  → server replays seq 45+
```

Because every event is persisted as a `BuildLog` row with a sequence number, resume is exact — no events lost, no duplicates (client dedupes by id).

### 12.4 Heartbeats

The server sends a comment frame (`:keepalive\n\n`) every 15 seconds to keep proxies from closing idle connections and to detect dead clients.

### 12.5 Why SSE Over WebSocket

- Traffic is one-directional (server → client). Commands go via normal HTTP.
- SSE auto-reconnects natively in the browser with `Last-Event-ID`.
- SSE works over HTTP/1.1 and HTTP/2 without upgrade negotiation.
- Fewer moving parts: no ping/pong, no connection state machine, simpler proxy configuration.

WebSocket would be justified if we needed bidirectional low-latency traffic (e.g., collaborative editing). That's a V2+ concern.

### 12.6 Client Store

Zustand store consumes SSE events:

```typescript
interface BuildStore {
  steps: Record<string, StepState>;
  terminal: string[];
  codeStream: { file: string; content: string }[];
  status: BuildStatus;
  connect(buildId: string): void;
  disconnect(): void;
  cancel(): Promise<void>;
}
```

Terminal and code buffers are capped (e.g., last 5000 lines) to bound memory.

---

## 13. Backend Architecture

### 13.1 Layer Structure

```
Request
  │
  ▼
Route Handler / Server Action   ← transport, auth, validation (Zod)
  │
  ▼
Service                         ← business logic, orchestration
  │
  ▼
Repository                      ← data access (Prisma)
  │
  ▼
PostgreSQL / Filesystem / Docker
```

Modules (`project`, `spec`, `agent`, `execution`, `version`, `deploy`, `credential`) each follow this structure. Services never talk to Prisma directly — they go through their repository. Cross-module calls go service → service.

### 13.2 Service Responsibilities

| Service | Responsibility |
|---------|---------------|
| `ProjectService` | CRUD projects, status transitions, workspace path allocation |
| `SpecService` | Generate/revise/approve specs, mark downstream stale |
| `AgentService` | Run agent phases, manage context, call LLM, execute tools |
| `BuildService` | Orchestrate build workflow, checkpoints, cancellation |
| `ExecutionService` | Provision/stop/destroy containers, exec commands, health |
| `VersionService` | Git commits, history, diffs, revert |
| `DeployService` | Subdomain allocation, SSL, persistence, GitHub export |
| `CredentialService` | Store/retrieve/encrypt credentials |

### 13.3 Error Handling Strategy

- **Typed errors:** `AppError` subclasses (`NotFoundError`, `ValidationError`, `ConflictError`, `ProviderError`, `TimeoutError`)
- **Boundary translation:** Route handlers catch `AppError` and map to HTTP status + user-safe message
- **Internal vs. user-facing:** Agent/build failures are logged to `InternalError` and mapped to generic user copy. Technical details never reach the client.
- **Never leak internals:** Stack traces, Prisma errors, and container logs stay server-side.

### 13.4 Long-Running Work

Build is the only long-running workflow. It runs in the Next.js server process started by an HTTP request that immediately returns a stream:

```
POST /api/projects/:id/build        → creates Build, returns { buildId }
GET  /api/projects/:id/builds/stream → SSE, drives progress
```

The build workflow runs as an async task within the server process, writing events to the bus. For V1 with 10-50 concurrent builds, in-process execution is sufficient. When we need durability across restarts, this moves to a job queue (BullMQ + Redis) with the same event interface.

### 13.5 Background Jobs

- **Inactive cleanup:** runs on an interval; stops preview containers idle > 2h
- **Orphan cleanup:** removes Docker resources with no project
- **Health checks:** periodic container health verification
- **Log retention:** prunes build logs older than N days

Implemented as an in-process scheduler for V1; extractable to a worker later.

### 13.6 Validation

Zod schemas are the single source of validation and types:

```typescript
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(10000).optional(),
  inputs: z.array(z.object({
    type: z.enum(['TEXT', 'FILE', 'SCREENSHOT']),
    content: z.string(),
  })).max(10),
});

type CreateProjectInput = z.infer<typeof createProjectSchema>;
```

The same schema validates the client form and the server action.

---

## 14. Frontend Architecture

### 14.1 Rendering Strategy

| Route | Strategy | Reason |
|-------|----------|--------|
| Landing | Static/SSR | SEO, fast first paint |
| Auth | Client | Interactive forms |
| Dashboard | Server Component | Data from DB, no client fetch |
| Input flow | Client | File uploads, local state |
| Approval flow | Server shell + Client islands | Spec content server-rendered, feedback area client |
| Build view | Client | SSE-driven, high-frequency updates |
| Project view | Server shell + Client widgets | File tree/editor/history are client |
| Settings | Server shell + Client forms | |

Server Components fetch and render; client islands handle interactivity. This keeps the initial payload small and avoids loading spinners for core data.

### 14.2 State Management Split

**Server state (React Server Components + server actions):**
- Project list, project detail, specs, build history, versions
- Revalidated via `revalidatePath` after mutations

**Client state (Zustand):**
- Build progress (steps, terminal, code stream) — high-frequency updates that shouldn't round-trip
- Local form/UI state (modals, panels)
- Preview frame state

The build store is deliberately separate from server state because SSE updates are frequent and ephemeral — caching them server-side would be wasteful.

### 14.3 Component Architecture

```
AppShell
├── Sidebar (nav)
├── Header (user, project actions)
└── Content
    ├── DashboardView
    │   └── ProjectCard[]
    ├── InputFlow
    │   ├── TextInput
    │   └── FileUpload
    ├── ApprovalFlow
    │   ├── StepIndicator
    │   ├── SpecRenderer (per type)
    │   └── FeedbackPanel
    ├── BuildView
    │   ├── BuildProgress
    │   ├── TerminalOutput
    │   └── CodeStream
    └── ProjectView
        ├── FileExplorer
        ├── CodeEditor (Monaco)
        ├── ChatPanel
        ├── HistoryPanel
        └── PreviewFrame
```

### 14.4 Real-Time UI

`BuildView` subscribes to the build store on mount and unsubscribes on unmount. The SSE connection is managed by the store, not the component, so navigating away and back resumes cleanly from `lastEventId`.

Terminal and code panels render from capped ring buffers and virtualize long lists to keep the DOM bounded.

### 14.5 Preview Frame

```
┌─────────────────────────────────────────────┐
│ [iframe: preview.url]        [↻] [⛶] [↗]    │
│                                              │
│  Rendering the live preview...               │
└─────────────────────────────────────────────┘
```

- The iframe is sandboxed appropriately and points at the preview subdomain
- "Open in new tab" is always available as a fallback (important for OAuth flows that break in iframes)
- A refresh button reloads the frame
- Responsive sizing adapts to the panel

### 14.6 Accessibility and UX

- Keyboard navigation throughout
- Focus management in modals and multi-step flows
- ARIA labels on interactive elements
- Loading skeletons for data areas
- Optimistic updates for mutations (approve, cancel) with rollback on failure
- Toasts for ephemeral feedback

---

## 15. API Design

### 15.1 Route Table

```
Auth
  POST   /api/auth/[...nextauth]              NextAuth handlers

Projects
  GET    /api/projects                        list user's projects
  POST   /api/projects                        create project
  GET    /api/projects/:id                    project detail
  PATCH  /api/projects/:id                    update name/description
  DELETE /api/projects/:id                    delete project + workspace

Inputs
  POST   /api/projects/:id/inputs             add text/file input
  GET    /api/projects/:id/inputs             list inputs
  DELETE /api/projects/:id/inputs/:inputId    remove input

Specs
  POST   /api/projects/:id/specs/generate     generate spec { type }
  GET    /api/projects/:id/specs              list specs (latest per type)
  POST   /api/projects/:id/specs/:specId/approve
  POST   /api/projects/:id/specs/:specId/reject
  POST   /api/projects/:id/specs/:specId/revise   { feedback }

Builds
  POST   /api/projects/:id/builds             start build
  GET    /api/projects/:id/builds             list builds
  GET    /api/projects/:id/builds/:buildId    build detail
  POST   /api/projects/:id/builds/:buildId/cancel
  GET    /api/projects/:id/builds/:buildId/stream   SSE

Versions
  GET    /api/projects/:id/versions           history
  GET    /api/projects/:id/versions/:vId/diff diff
  POST   /api/projects/:id/versions/:vId/revert

Credentials
  GET    /api/projects/:id/credentials        list (masked)
  PUT    /api/projects/:id/credentials/:service
  DELETE /api/projects/:id/credentials/:service

Chat / Changes
  POST   /api/projects/:id/changes            request a change { message }

Preview
  POST   /api/projects/:id/preview/start
  POST   /api/projects/:id/preview/stop

Deploy
  POST   /api/projects/:id/deploy             deploy on KairoPro
  POST   /api/projects/:id/export/github      export to GitHub
```

### 15.2 Conventions

- **Versionless:** API is internal to the app; breaking changes ship with the client.
- **JSON everywhere** except file uploads (multipart) and SSE.
- **Auth:** NextAuth session; every route verifies ownership of the project.
- **Errors:** consistent shape `{ error: { code, message } }` with a user-safe message.
- **Pagination:** cursor-based (`?cursor=&limit=`) for list endpoints that can grow (versions, logs).
- **Idempotency:** approval and cancel are idempotent; build start is guarded against duplicate concurrent builds.

### 15.3 Ownership Enforcement

Every project-scoped route runs the same guard:

```
session = await getSession()
project = await projectRepo.find(id)
if (!project || project.userId !== session.user.id) throw new NotFoundError()
```

Not-found (rather than forbidden) avoids leaking the existence of other users' projects.

---

## 16. Version Control Strategy

### 16.1 Workspace as Git Repo

Each workspace is initialized as a git repo at creation:

```
/var/kairopro/workspaces/{projectId}/.git
```

A single local user (the KairoPro service) owns all commits. No remote is configured until GitHub export.

### 16.2 Commit Points

| Trigger | Commit Message |
|---------|----------------|
| Project created | "Initialize project" |
| Spec approved | "Approve {spec type} v{n}" |
| Build completes | "Initial build" |
| Change applied | "{user change description}" |
| Build cancelled | "Checkpoint: cancelled during {step}" |
| Revert | "Revert: {original message}" |

### 16.3 Commit Implementation

Commits are made with `git` CLI via `child_process` (or `isomorphic-git`). The service:

1. Stages all changes in the workspace
2. Creates a commit with the message
3. Records `commitHash`, `message`, `filesChanged` in the `Version` table
4. Computes a diff summary for the history UI

### 16.4 Undo / Revert

```
POST /api/projects/:id/versions/:vId/revert
  → git revert --no-edit {commitHash}      (or checkout for older versions)
  → container rebuild if the change affects runtime
  → new Version row: "Revert: {message}"
```

Undo creates a new commit rather than rewriting history, so history stays linear and auditable.

### 16.5 Simplified Diffs

Raw git diffs are noisy. The history UI shows a simplified view:

- Files changed (count + list)
- Lines added / removed
- Natural-language summary (generated by the LLM when the change is created)

The raw diff is available on demand for developers.

### 16.6 Why Git

Git is a mature, correct, and widely understood system for tracking file changes. Building a custom snapshot system would reimplement diffing, history, and revert — worse and slower. Git is hidden behind the API, so users never see git concepts unless they want to (GitHub export).

---

## 17. Preview and Deployment

### 17.1 Preview Provisioning

```
provisionPreview(projectId)
  → ensure network + containers running
  → assign previewSubdomain (e.g. taskmanager-a1b2)
  → set caddy labels on app container
  → wait for HTTP 200 on /.internal-health
  → store previewUrl = https://{sub}.preview.kairopro.dev
```

Caddy watches Docker labels and automatically:
- Routes `{sub}.preview.kairopro.dev` → container:3000
- Provisions a wildcard TLS certificate for `*.preview.kairopro.dev`

A wildcard certificate for the preview domain means no per-preview cert issuance and no rate limits.

### 17.2 Deploy on KairoPro

```
deploy(projectId, subdomain)
  → validate subdomain (format, availability, reserved words)
  → reserve subdomain (unique constraint)
  → retag labels for {subdomain}.kairopro.app
  → ensure container restart policy = always
  → run migrations against the persistent DB volume
  → wait for health check
  → set Project.status = DEPLOYED, deployedUrl = https://{subdomain}.kairopro.app
```

Differences from preview:

- Preview containers can be stopped by inactivity cleanup; deployed containers cannot.
- Deployed apps get the production subdomain and a dedicated persistent volume.
- Deployed apps are backed up (DB snapshot) on a schedule.

### 17.3 SSL

Caddy handles ACME automatically:

- Wildcard `*.preview.kairopro.dev` via DNS-01 challenge
- Per-subdomain `*.kairopro.app` via DNS-01 challenge (wildcard)
- Certificates auto-renew

### 17.4 GitHub Export

```
exportToGitHub(projectId, repoName, visibility)
  → ensure user has GitHub connected (OAuth token stored in Account)
  → create repo via GitHub API
  → git remote add origin https://{token}@github.com/{user}/{repo}.git
  → git push -u origin main
  → write README with project description + stack + setup steps
```

The token is used transiently for the push and never stored in the workspace.

### 17.5 Custom Domains (V2)

Postponed. Requires:
- User-entered domains
- DNS verification (TXT record)
- Per-domain certificate issuance
- Domain-to-project mapping table

The reverse proxy already supports it; the missing pieces are the UI and verification flow.

---

## 18. Testing Strategy

### 18.1 Testing KairoPro Itself

| Level | Scope | Tools |
|-------|-------|-------|
| Unit | Services, context builder, recovery ladder, crypto | Vitest |
| Integration | Repositories against a test DB, git ops, event bus | Vitest + Testcontainers |
| E2E | Full flows: create → approve → build → preview | Playwright |
| Contract | LLM provider interface with a mock provider | Vitest |

### 18.2 Testing Generated Apps

The agent runs a deterministic validation sequence after code generation:

1. **Type check** — `tsc --noEmit` (per-file during generation, whole project at the end)
2. **Lint** — `eslint` with auto-fix
3. **Build** — `next build` (catches build-time errors)
4. **Migration** — `prisma migrate deploy` against the project DB
5. **Boot** — start server, assert HTTP 200 on `/` and `/api/health`
6. **Smoke test** — generated Playwright smoke tests that exercise the main flows (login, primary CRUD)
7. **Visual check** — screenshot key pages via headless browser

Each step feeds the fix loop on failure.

### 18.3 Generated Smoke Tests

The code-gen step also generates a minimal smoke test suite based on the approved App Structure:

```typescript
test('can log in', ...)
test('can create a task', ...)
test('can list tasks', ...)
```

These are intentionally shallow — they prove the app works end-to-end, not that every edge case is handled.

### 18.4 Golden Projects

A set of reference projects (task manager, CRM, booking app) are used as regression tests. Every change to prompts, tools, or the template is validated against these to catch regressions in generation quality. Success is measured by: does it build, does it pass smoke tests, how many fix iterations did it take.

### 18.5 What We Don't Test (V1)

- Full unit test coverage of generated apps (the user's responsibility)
- Load testing of generated apps
- Cross-browser matrix for generated apps

---

## 19. Observability

### 19.1 Logging

Structured JSON logs (Pino) with correlation IDs:

```json
{
  "level": "info",
  "time": "...",
  "projectId": "...",
  "buildId": "...",
  "step": "generating_api",
  "msg": "Generated route handler",
  "file": "src/app/api/tasks/route.ts",
  "durationMs": 2340
}
```

Every build is traceable end-to-end by `buildId`.

### 19.2 Metrics

| Metric | Type | Use |
|--------|------|-----|
| `build.started` | counter | Volume |
| `build.completed` | counter | Success rate (complete vs. partial) |
| `build.duration` | histogram | Performance |
| `build.fix_iterations` | histogram | Generation quality |
| `llm.tokens` | counter | Cost |
| `llm.latency` | histogram | Provider performance |
| `tool.calls` | counter by tool | Agent behavior |
| `container.provision` | histogram | Infra performance |
| `error.internal` | counter by type | Reliability |

### 19.3 Internal Error Dashboard

`InternalError` rows power a dashboard showing:

- Failures by step and type
- How often graceful degradation rescued a build
- Which features most often need simplification
- Trends over time

This is the primary feedback loop for improving prompts and templates.

### 19.4 Health Checks

- `GET /api/health` — KairoPro app health (DB connectivity, Docker daemon reachable)
- Per-project `GET /api/projects/:id/health` — container health
- Scheduler probes containers and restarts unhealthy ones (with backoff)

### 19.5 Alerting (V1)

Alerts (via a simple notifier) on:

- Build success rate below threshold
- LLM provider error rate spike
- Docker daemon unreachable
- Disk usage above threshold

---

## 20. Scalability Strategy

### 20.1 Scaling Dimensions

| Dimension | V1 | V2 | V3 |
|-----------|----|----|----|
| App instances | 1 | N behind LB | N + autoscale |
| Database | 1 Postgres | 1 + read replica | Managed + replicas |
| Event bus | In-process | Redis pub/sub | Redis cluster |
| Job execution | In-process | BullMQ workers | Distributed workers |
| Containers | 1 Docker host | N Docker hosts | Scheduler + microVMs |
| Storage | Local disk | Shared volume (NFS/EFS) | Object storage |
| LLM | 1 provider | 2 providers | Router with fallback |

### 20.2 V1 Bottlenecks and Their Fixes

| Bottleneck | Symptom | Fix |
|-----------|---------|-----|
| Single host Docker | Can't exceed host capacity | Add hosts, shard projects by host |
| In-process event bus | Events lost on restart; no multi-instance | Move to Redis pub/sub |
| Local workspace storage | Not shared across hosts | Move to shared storage or object storage with local cache |
| In-process builds | Builds compete with app for CPU | Move builds to dedicated workers |
| Single LLM provider | Rate limits, outages | Add provider fallback |
| Postgres connection pool | Exhaustion under load | PgBouncer or managed pooling |

### 20.3 Scaling Path

```
Stage 1 (V1):     single host, all-in-one
Stage 2:          app instance + worker instance, Redis bus
Stage 3:          N app instances behind LB, shared storage, DB replica
Stage 4:          container scheduling across hosts, microVM isolation
Stage 5:          multi-region, CDN for deployed apps
```

Each stage is triggered by a concrete limit being hit, not by anticipation.

### 20.4 Data Growth

- **Build logs:** pruned after N days; archived to object storage if needed
- **Workspaces:** deleted with project; snapshots optional
- **Versions:** git repo grows slowly; acceptable indefinitely
- **InternalErrors:** pruned after N days, aggregated counts retained

---

## 21. Cost Model

### 21.1 Cost Drivers

| Driver | V1 cost | Notes |
|--------|---------|-------|
| LLM tokens | Dominant | Builds involve many calls; context selection is a direct cost lever |
| Compute (host) | Moderate | App + N project containers |
| Storage | Low | Workspaces + build logs |
| Egress | Low | Preview/deployed traffic |
| SSL | Free | Let's Encrypt |
| DNS | Low | Wildcards |

### 21.2 Cost per Build (Estimate)

A typical build (~30 files, 2 fix iterations):

- Spec generation: 3 calls, ~20k tokens total in, ~8k out
- Code generation: ~30 calls, large context each
- Fix iterations: ~6 calls
- Total: on the order of hundreds of thousands of tokens

The dominant cost is code generation because each file gets a substantial context. Cost levers:

- **Prompt caching** for the stable prefix (biggest lever)
- **Context budgeting** (don't send irrelevant files)
- **Model tiering** (cheaper model for summarization and indexing)
- **Fewer fix iterations** (better templates + prompts)

### 21.3 Pricing (V2)

Deferred with billing, but the model under consideration:

- **Free:** 1 project, N generations, preview only
- **Pro:** unlimited projects, deploy, GitHub export, priority

Pricing must cover LLM cost per build with margin. Usage-based caps prevent abuse.

### 21.4 Cost Controls

- Per-user and per-build token caps
- Build concurrency limits
- Inactivity cleanup to avoid idle container cost
- Log retention to bound storage

---

## 22. Security

### 22.1 Application Security

| Concern | Mitigation |
|---------|-----------|
| Auth | NextAuth, httpOnly session cookies, secure in production |
| Authorization | Ownership checks on every project route |
| CSRF | Next.js server actions + same-site cookies |
| Input validation | Zod on every boundary |
| File uploads | Type allowlist, size limit, stored outside web root |
| Rate limiting | Per-user limits on generation and build endpoints |
| SQL injection | Prisma parameterized queries |
| XSS | React escaping; no `dangerouslySetInnerHTML` on user content |
| Secrets | Env vars, never committed; encrypted credentials at rest |

### 22.2 Credential Handling

```
User enters key
   │
   ▼
AES-256-GCM encrypt (random IV per record)
   │
   ├── stored: encryptedData, iv, authTag
   │
   ▼
At container provision:
   ├── decrypt in memory
   ├── write to workspace .env (0600 permissions)
   └── inject as container env vars
```

Plaintext keys exist only in memory during provisioning and inside the project container. They are never logged.

### 22.3 Infrastructure Security

- Docker socket access is restricted to the KairoPro app process
- The app runs as a dedicated non-root user
- Project containers run non-root with no host mounts
- Firewall rules limit host exposure to 80/443
- SSH access key-based only

### 22.4 Abuse Prevention (V1)

- Rate limits on generation endpoints
- Build concurrency caps per user
- Command denylist in `run_command`
- Resource limits per container
- Content review for illegal use (manual in V1)

### 22.5 V3 Security Upgrades

- MicroVM isolation
- Network egress policies
- Secret rotation
- Audit logging
- SOC 2 preparation

---

## 23. Development Roadmap

### Phase 1 — Foundation
- Next.js + TypeScript + Tailwind + shadcn/ui scaffold
- Prisma schema + migrations
- NextAuth (email/password + Google)
- App shell (sidebar, header, dashboard)
- Project CRUD
- Workspace allocation + git init
- Local Docker compose for dev

**Exit:** User can sign up, create a project, see it in the dashboard.

### Phase 2 — Input & Specs
- Input flow (text + file upload, storage)
- File text extraction (PDF/DOCX) + image handling
- LLM provider interface + first provider
- Spec generation (PRD → Data Model → App Structure)
- Approval flow UI (3 steps, feedback loop)
- Spec versioning + staleness
- Credentials collection + encryption

**Exit:** User can provide input, review and approve all three specs.

### Phase 3 — Code Generation
- Template (`packages/templates/nextjs-shadcn`)
- Tool registry + file/search/exec tools
- Code-gen prompts
- File-by-file generation with type checks
- Fix loop + graceful degradation ladder
- Context builder (summary, file index, dependency graph)
- Internal error logging

**Exit:** From approved specs, the system generates a project that type-checks and builds.

### Phase 4 — Execution & Preview
- Docker manager (network, compose, limits)
- Credential injection + env generation
- Migration + boot + health checks
- Terminal streaming
- Caddy routing + wildcard SSL
- Preview URL provisioning
- Build view UI (status, terminal, code stream)
- SSE (with seq/resume) + event bus
- Cancel with checkpoint

**Exit:** User can build, watch progress in real time, and open a working preview.

### Phase 5 — Change Management
- Change request flow + context retrieval
- Change confirmation dialog
- Diff generation + history UI
- Undo/revert
- File explorer + Monaco viewer
- Chat panel

**Exit:** User can request changes to an existing project and see them applied.

### Phase 6 — Deploy & Export
- Deploy on KairoPro (subdomain, persistence, production routing)
- SSL for production subdomains
- DB backup scheduling
- GitHub OAuth + repo creation + push
- README generation
- Deploy/export UI

**Exit:** User can deploy to a live URL or export to GitHub.

### Phase 7 — Hardening & Launch
- Golden project regression suite
- Metrics + internal error dashboard
- Alerting
- Inactive/orphan cleanup jobs
- Rate limiting
- Security review + container hardening
- Landing page polish
- Documentation
- Load test to V1 targets (10-50 concurrent builds)

**Exit:** V1 is stable, observable, and launchable.

### Sequencing Rationale

Phases are ordered by dependency, not by visible value alone: you cannot generate code (3) without specs (2), you cannot preview (4) without generated code, you cannot change (5) without a project, and you cannot deploy (6) without a running preview. Each phase produces a testable system.

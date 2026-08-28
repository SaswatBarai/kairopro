# KairoPro Development Roadmap

**Stack:** Next.js (Frontend + Backend) · FastAPI (AI Engine) · PostgreSQL · Redis · MinIO/S3 · Docker

**Strategy:** All development uses local Docker services. AWS cloud infrastructure is deferred to Phase 8.

---

# Monorepo Structure

```text
kairopro/
├── apps/
│   ├── web/                    # Next.js (UI + API Routes + Platform Logic)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── dashboard/
│   │   │   └── projects/[projectId]/
│   │   │       ├── overview/ | prd/ | design/ | architecture/
│   │   │       ├── build/ | code/ | preview/ | deployments/
│   │   │   └── api/            # All backend API routes
│   │   │       ├── auth/[...nextauth]/
│   │   │       ├── projects/
│   │   │       ├── files/
│   │   │       ├── sandbox/
│   │   │       ├── deploy/
│   │   │       ├── github/
│   │   │       └── events/     # SSE stream
│   │   ├── components/         # Monaco, Xterm.js, AI chat, etc.
│   │   ├── lib/                # db.ts, redis.ts, docker.ts, ai-client.ts
│   │   └── prisma/schema.prisma
│   │
│   └── ai/                     # FastAPI AI Engine (internal only)
│       └── app/
│           ├── main.py
│           ├── api/            # AI endpoints
│           ├── agents/         # orchestrator, requirement, prd, design, arch, dev, debug
│           ├── llm/            # pluggable providers
│           ├── rag/            # embeddings + retriever
│           └── documents/      # pdf, docx, markdown, images
│
├── packages/
│   ├── types/                  # Shared TypeScript types
│   ├── schemas/                # JSON Schemas / Zod
│   └── prompts/                # AI prompt templates
│
├── infrastructure/
│   ├── terraform/
│   └── ecs/
│
├── scripts/
└── docker-compose.yml
```

---

# Core Principles

1. **Next.js is the control plane.** All security, infrastructure operations, and API routes live here.
2. **FastAPI is stateless.** No project state — all persistence goes through Next.js API to PostgreSQL.
3. **The browser never calls FastAPI.** Next.js proxies all AI requests.
4. **Pluggable LLM providers.** Swap OpenAI / Anthropic / Google without rewriting agent logic.
5. **Sandbox isolation.** AI-generated code runs only in per-project Docker containers.

---

# Phase 1: Foundation & Local Environment

**Objective:** Monorepo, Docker dev environment, and CI pipelines running.
**Completion Criteria:** All services start locally; CI passes on GitHub.

## Module 1.1: Planning & Contracts

### Task 1.1.1: Schemas & OpenAPI Specs
- Write OpenAPI specs for Next.js API routes and FastAPI
- Define Zod schemas in `packages/schemas/`
- Design PostgreSQL ERD (via Prisma schema)
- **Validation:** Schemas parseable; Prisma migration runs cleanly

## Module 1.2: Repository & Scaffolding

### Task 1.2.1: Initialize Monorepo (Turborepo)
- Scaffold Next.js app (`apps/web`) with App Router, TypeScript, Tailwind, shadcn/ui
- Scaffold FastAPI app (`apps/ai`) with Uvicorn, Pydantic v2
- Add `packages/types`, `packages/schemas`, `packages/prompts`
- **Validation:** `turbo run dev` starts both apps; hello-world responses on `:3000` and `:8000`

### Task 1.2.2: Docker Compose for Local Dev
- Services: `postgres:16`, `redis:7`, `minio/minio`, `mailhog`
- Add health checks for all containers
- **Validation:** `docker compose up` → all containers healthy

## Module 1.3: Database & ORM

### Task 1.3.1: Prisma Setup
- Define core schema: users, organizations, projects, documents, tasks
- Run initial migration
- Seed script for local dev
- **Validation:** `prisma studio` shows tables; seed populates test data

### Task 1.3.2: pgvector Extension
- Enable pgvector in Postgres
- Add `document_chunks` table with `embedding vector(1536)` column
- **Validation:** Vector similarity query returns results

## Module 1.4: Local Service Integration

### Task 1.4.1: Redis + BullMQ in Next.js
- Setup Redis client in `apps/web/lib/redis.ts`
- Create BullMQ queues: `document-processing`, `ai-analysis`, `code-generation`, `deployment`
- **Validation:** Enqueue/consume test job successfully

### Task 1.4.2: MinIO Integration in Next.js
- Setup S3-compatible SDK pointing to MinIO in `apps/web/lib/storage.ts`
- Presigned URL upload + download
- **Validation:** Upload file via API; confirm in MinIO console

## Module 1.5: CI Pipeline

### Task 1.5.1: GitHub Actions
- Workflow: lint + type-check (Next.js), pytest (FastAPI), docker build smoke test
- **Validation:** Failed test blocks PR merge

## Module 1.6: Observability Base

### Task 1.6.1: OpenTelemetry
- OTel SDK in Next.js and FastAPI → local Jaeger
- Structured JSON logging
- **Validation:** Traces visible in Jaeger UI on `:16686`

---

# Phase 2: Authentication & Project Management

**Objective:** Users can sign up, log in, create organizations and projects.
**Completion Criteria:** Full auth flow works; dashboard shows projects; emails captured in MailHog.

## Module 2.1: Authentication

### Task 2.1.1: NextAuth.js Setup
- Providers: Email/password (Credentials), Google, GitHub
- Prisma adapter for session/user storage
- Middleware: protect all `/dashboard` and `/projects` routes
- **Validation:** Login → redirect to dashboard; unauthorized → redirect to login

### Task 2.1.2: RBAC Middleware
- Roles: Owner, Admin, Developer, Designer, Viewer
- Enforce in `middleware.ts`
- **Validation:** Viewer cannot trigger deploy (403 returned)

## Module 2.2: Organizations & Projects CRUD

### Task 2.2.1: Next.js API Routes
- `POST/GET /api/projects` — create, list
- `GET/PATCH/DELETE /api/projects/:id` — get, update, delete
- `POST /api/organizations` — create org
- **Validation:** Postman tests for all CRUD operations pass

### Task 2.2.2: Dashboard UI
- Project cards with status badges
- Create project modal
- **Validation:** UI calls API; project list updates in real time

## Module 2.3: Email Notifications (Local)

### Task 2.3.1: MailHog Integration
- Email service in `apps/web/lib/email.ts` (nodemailer → `localhost:1025`)
- Trigger: signup confirmation, invite, project state changes
- **Validation:** Emails appear in MailHog UI at `localhost:8025`

---

# Phase 3: File Upload & Knowledge Base

**Objective:** Users upload files; FastAPI parses and embeds them into pgvector.
**Completion Criteria:** A vector search returns relevant chunks from an uploaded PDF.

## Module 3.1: File Upload

### Task 3.1.1: Next.js Upload API
- `POST /api/projects/:id/files` — validate, store in MinIO, record in DB
- Return presigned URL for direct browser upload
- **Validation:** File appears in MinIO console; DB record created

## Module 3.2: Document Processing Pipeline

### Task 3.2.1: BullMQ → FastAPI Worker
- Next.js enqueues `document-processing` job after upload
- FastAPI worker: pull file from MinIO, parse, chunk, embed, store in pgvector
- Parsers: PyPDF2 (PDF), python-docx (DOCX), markdown (MD), Tesseract + GPT Vision (images)
- **Validation:** pgvector table shows embedded chunks; semantic search returns correct results

---

# Phase 4: AI Engine — Requirements & PRD

**Objective:** FastAPI agents extract requirements, ask clarifications, generate a versioned PRD.
**Completion Criteria:** AI produces a structured PRD from a vague prompt + uploaded PDF.

## Module 4.1: FastAPI Agent Framework

### Task 4.1.1: Orchestrator + Base Agent
- `orchestrator.py` manages agent lifecycle and state transitions
- Base agent class: structured input/output contracts, Pydantic v2 models
- **Validation:** Unit tests for state transitions pass

### Task 4.1.2: LLM Provider Layer
- Pluggable interface: `provider.py` → OpenAI / Anthropic / Google implementations
- Streaming support (NDJSON chunks)
- **Validation:** Swap provider via env var; same output schema returned

## Module 4.2: Requirement Agent

### Task 4.2.1: Requirement Extraction
- RAG query → relevant chunks from pgvector
- LLM prompt chain → structured `Requirement[]` with confidence scores
- POST `/ai/analyze` → returns requirements + clarification questions
- **Validation:** JSON schema matches; low-confidence items have questions

### Task 4.2.2: Clarification UI
- Next.js UI shows questions; user submits answers
- Answers stored as project context, re-embedded into pgvector
- **Validation:** After answers, requirement confidence improves

## Module 4.3: PRD Agent

### Task 4.3.1: PRD Generation
- POST `/ai/prd` → FastAPI generates structured PRD JSON
- Next.js saves as `prd_versions` record
- **Validation:** Complete PRD with all sections generated

### Task 4.3.2: PRD Editor & Versioning
- Tiptap or ProseMirror editor in Next.js UI
- `PATCH /api/projects/:id/prd` saves new version
- Version history UI with diff view
- **Validation:** Edit and save creates new version; rollback restores previous

---

# Phase 5: AI Engine — Design & Architecture

**Objective:** Generate design options and technical architecture from approved PRD.
**Completion Criteria:** User approves a design and architecture, unblocking development.

## Module 5.1: Design Agent

### Task 5.1.1: Design Generation
- POST `/ai/design` → 3 design specifications (color, typography, spacing, components)
- Next.js UI renders preview of each design option
- Accept uploaded screenshots → FastAPI vision model extracts design tokens
- **Validation:** UI renders 3 distinct design previews; user can select one

## Module 5.2: Architecture Agent

### Task 5.2.1: Architecture Generation
- POST `/ai/architecture` → maps PRD to: Next.js routes, API routes, Prisma schema, external services
- Next.js stores as `architecture_versions` record
- User can request AI to modify architecture
- **Validation:** Architecture JSON is complete and matches PRD requirements

---

# Phase 6: KairoPro IDE & Sandbox

**Objective:** Browser-based IDE with file tree, code editor, terminal, live preview.
**Completion Criteria:** User can view files, see terminal output, and interact with a live preview.

## Module 6.1: IDE UI

### Task 6.1.1: Monaco Code Editor
- File tree with expand/collapse
- Monaco Editor with syntax highlighting for TS, Python, SQL, JSON
- Multi-tab support
- **Validation:** Syntax highlighting works; file content loads from workspace API

### Task 6.1.2: Xterm.js Terminal
- WebSocket connection: `ws://localhost:3000/api/sandbox/terminal`
- Next.js API proxies stdin/stdout to sandbox container via Docker SDK exec
- **Validation:** Commands run in container; real-time output in UI

## Module 6.2: Sandbox Management (Next.js API)

### Task 6.2.1: Container Lifecycle
- `POST /api/projects/:id/sandbox` — create + start Docker container
- `DELETE /api/projects/:id/sandbox` — stop container
- Volume mount: `/workspaces/{project-id}/`
- Resource limits: 1 vCPU, 2 GB RAM, 10 GB disk
- **Validation:** Container starts; files written to volume appear inside container

### Task 6.2.2: Sandbox Exec API
- `POST /api/projects/:id/sandbox/exec` — run command, stream stdout/stderr via SSE
- Used by FastAPI agents to run tests, builds, git commands
- **Validation:** `npm run dev` starts; output streams to browser

## Module 6.3: Live Preview

### Task 6.3.1: Reverse Proxy
- Next.js middleware routes `{id}.preview.kairopro.in` → sandbox container port
- **Validation:** Preview URL returns 200 from running app in sandbox

---

# Phase 7: AI Development & Execution Loop

**Objective:** FastAPI AI writes, tests, and debugs code until the app runs in the sandbox.
**Completion Criteria:** AI generates a complete application; tests pass; preview is live.

## Module 7.1: Developer Agent

### Task 7.1.1: Task Graph Generation
- POST `/ai/plan` → FastAPI breaks architecture into ordered coding tasks
- Next.js stores tasks in `tasks` table
- **Validation:** Tasks are topologically ordered (DB before API before UI)

### Task 7.1.2: Code Generation Loop
- POST `/ai/code` per task → FastAPI returns `FileChange[]`
- Next.js writes files to sandbox via `/api/projects/:id/sandbox/exec`
- After each file: run `tsc --noEmit` or linter, stream result back to FastAPI
- **Validation:** Generated files compile without errors

## Module 7.2: Test & Debug Loop

### Task 7.2.1: Autonomous Test Execution
- FastAPI Test Agent calls `POST /api/projects/:id/sandbox/exec` → `npm test`
- Parses stdout for failures
- **Validation:** Agent correctly identifies test failures from logs

### Task 7.2.2: Auto-Fix Loop
- POST `/ai/debug` with error context → FastAPI proposes file modification
- Next.js applies change via sandbox exec
- Retry up to `MAX_REPAIR_ATTEMPTS = 5`
- **Validation:** Introduce deliberate bug; agent fixes and tests pass

---

# Phase 8: Cloud Infrastructure & Production Deployment

**Objective:** Provision AWS; deploy KairoPro platform and user apps to production.
**Completion Criteria:** AWS infrastructure live; users can deploy apps with a custom domain.

## Module 8.1: Terraform Infrastructure

### Task 8.1.1: Core Network & Compute
- VPC, subnets, ECS clusters for Next.js and FastAPI
- ALB, CloudFront
- **Validation:** ECS services healthy in AWS console

### Task 8.1.2: Data & Messaging
- RDS PostgreSQL (with pgvector), ElastiCache Redis, S3 buckets, SQS queues
- AWS Secrets Manager
- **Validation:** Apps connect to RDS and S3; switch from MinIO/local Redis

## Module 8.2: GitHub Integration

### Task 8.2.1: GitHub Sync via Next.js API
- `POST /api/github/connect` — OAuth, store token
- `POST /api/github/sync` — create repo, commit generated code, push
- Webhook handler for external changes
- **Validation:** Generated code appears on GitHub; webhook triggers re-analysis

## Module 8.3: Production Deployment Engine

### Task 8.3.1: Image Builder (Next.js API)
- BullMQ deployment worker: `docker build` in sandbox → `docker push` to ECR
- **Validation:** Image tagged and visible in ECR

### Task 8.3.2: ECS Deployer (Next.js API)
- Register ECS task definition; update ECS service
- Poll ALB target group health checks
- Emit `deployment.live` event via Redis → SSE
- **Validation:** ECS task running; preview URL returns 200

## Module 8.4: Domains & Secrets

### Task 8.4.1: Custom Domains
- Route 53 + ACM certificate via Next.js API (AWS SDK)
- **Validation:** `https://customdomain.com` routes to app

### Task 8.4.2: Secrets UI
- UI to add environment variables and secrets
- Next.js API stores in AWS Secrets Manager; injects into ECS task definition
- **Validation:** App reads secret at runtime correctly

---

# Phase 9: Production Readiness & Launch

**Objective:** Scale, harden, and release KairoPro publicly.
**Completion Criteria:** Zero P1 bugs; platform handles 100 concurrent users; MVP shipped.

## Module 9.1: Performance

### Task 9.1.1: Load Testing & Optimization
- k6 load tests for Next.js API and FastAPI
- Semantic caching for LLM responses (Redis)
- DB query optimization (add indexes, analyze slow queries)
- **Validation:** 100 concurrent users without degradation

## Module 9.2: Reliability

### Task 9.2.1: Automated Rollback
- ECS deployer monitors health checks post-deploy; reverts if unhealthy
- **Validation:** Deploy intentionally broken image → auto-rollback to previous

### Task 9.2.2: Circuit Breakers
- FastAPI retries with exponential backoff on LLM failures
- Next.js returns graceful error UI on FastAPI timeout
- **Validation:** Kill FastAPI; Next.js shows "AI unavailable" instead of 500

## Module 9.3: MVP Launch

### Task 9.3.1: UI Polish
- Framer Motion animations on key transitions
- Dark mode, responsive layouts, premium typography
- **Validation:** Design QA sign-off; Lighthouse score ≥ 90

### Task 9.3.2: Final QA
- Full E2E run (Playwright): create project → deploy → live URL
- Beta tester feedback addressed
- **Validation:** Zero P1 bugs; successful public launch

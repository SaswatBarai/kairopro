# Phase 1: Foundation & Local Environment — Implementation Plan

## Overview

Implement all 4 modules of Phase 1: system schemas/contracts, monorepo scaffolding, local infrastructure/CI, and observability. The end state is a working local dev environment where all 3 services (Next.js, Go/Chi, FastAPI) respond with 200 OK, connected to Postgres+pgvector, Redis, MinIO, and MailHog via Docker Compose, with CI pipelines and local tracing.

**Key decisions:**
- Go framework: **Chi**
- Migration tool: **Goose** (Go-native, SQL + Go migrations)
- Monorepo tool: **Turborepo** (for the JS/TS side; Go and Python managed independently)
- All 4 modules implemented together

---

## Module 1.1: System Schemas & Contracts

### 1.1.1 — OpenAPI Specs

**Files to create:**
- `apps/api/api-spec.yaml` — Go platform API spec
- `apps/ai/api-spec.yaml` — FastAPI AI engine spec

**Go API routes (from technical.md Section 9):**
```
POST /api/v1/projects
GET  /api/v1/projects/:id
POST /api/v1/projects/:id/files
GET  /api/v1/projects/:id/files
POST /api/v1/projects/:id/analyze
POST /api/v1/projects/:id/prd
POST /api/v1/projects/:id/design
POST /api/v1/projects/:id/build
GET  /api/v1/projects/:id/tasks
POST /api/v1/projects/:id/sandbox
POST /api/v1/projects/:id/deploy
GET  /api/v1/projects/:id/logs
GET  /api/v1/projects/:id/events
```

Plus auth routes:
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/oauth/:provider
```

**FastAPI AI routes (from technical.md Section 10):**
```
POST /ai/v1/analyze          — requirement analysis
POST /ai/v1/prd               — PRD generation
POST /ai/v1/design            — design generation
POST /ai/v1/architecture      — architecture generation
POST /ai/v1/develop           — code generation
POST /ai/v1/test              — test execution
POST /ai/v1/debug             — debug/fix cycle
GET  /ai/v1/status/:run_id    — agent run status
```

### 1.1.2 — JSON Schemas (Shared Contracts)

**Files to create in `packages/schemas/`:**
- `project.schema.json`
- `requirement.schema.json`
- `prd.schema.json`
- `task.schema.json`
- `agent-event.schema.json`
- `deployment.schema.json`

Each schema follows the structured output formats from technical.md Sections 13-14 and 21.

### 1.1.3 — PostgreSQL Schema (Goose Migrations)

**Files to create in `apps/api/migrations/`:**
- `00001_create_users.sql`
- `00002_create_organizations.sql`
- `00003_create_projects.sql`
- `00004_create_documents.sql`
- `00005_create_requirements.sql`
- `00006_create_prd_versions.sql`
- `00007_create_design_versions.sql`
- `00008_create_architecture_versions.sql`
- `00009_create_tasks.sql`
- `00010_create_agent_runs.sql`
- `00011_create_workspaces.sql`
- `00012_create_builds.sql`
- `00013_create_environments_deployments.sql`
- `00014_create_repositories.sql`
- `00015_create_secrets.sql`
- `00016_create_audit_logs.sql`
- `00017_create_usage_records.sql`
- `00018_enable_pgvector.sql`

Core tables from technical.md Section 16, with relationships from Section 17.

---

## Module 1.2: Repository Setup & Local Dev

### 1.2.1 — Monorepo Root Config

**Files to create:**
- `package.json` — root monorepo config with Turborepo
- `turbo.json` — Turborepo pipeline config (build, dev, lint, test)
- `.gitignore` — expanded with Node, Go, Python, IDE, OS patterns
- `.env.example` — all environment variables documented
- `.editorconfig` — consistent formatting across languages

### 1.2.2 — Next.js App (`apps/web/`)

**Files to create:**
- `apps/web/package.json` — Next.js 14+, React 18, TypeScript, Tailwind, shadcn/ui
- `apps/web/tsconfig.json`
- `apps/web/next.config.ts`
- `apps/web/tailwind.config.ts`
- `apps/web/postcss.config.js`
- `apps/web/app/layout.tsx` — root layout with providers
- `apps/web/app/page.tsx` — landing page (hello world)
- `apps/web/app/(auth)/login/page.tsx` — login placeholder
- `apps/web/app/dashboard/page.tsx` — dashboard placeholder
- `apps/web/app/projects/[projectId]/overview/page.tsx` — project overview placeholder

### 1.2.3 — Go API (`apps/api/`)

**Files to create:**
- `apps/api/go.mod` — module `github.com/kairopro/api`, Go 1.22+
- `apps/api/cmd/server/main.go` — entry point with Chi router, health endpoint
- `apps/api/internal/auth/handler.go` — auth handler stub
- `apps/api/internal/projects/handler.go` — projects handler stub
- `apps/api/internal/workspaces/handler.go` — workspaces handler stub
- `apps/api/internal/sandbox/handler.go` — sandbox handler stub
- `apps/api/internal/github/handler.go` — github handler stub
- `apps/api/internal/events/handler.go` — events handler stub
- `apps/api/pkg/database/postgres.go` — Postgres connection helper
- `apps/api/pkg/database/config.go` — DB config struct
- `apps/api/pkg/storage/minio.go` — MinIO S3 client helper
- `apps/api/pkg/storage/config.go` — storage config struct
- `apps/api/pkg/queue/redis.go` — Redis client helper
- `apps/api/pkg/queue/config.go` — queue config struct

The `main.go` will:
- Load env vars
- Connect to Postgres, Redis, MinIO
- Register all route groups under `/api/v1/`
- Start HTTP server on `:8080`
- Expose `GET /health` returning 200 OK

### 1.2.4 — FastAPI AI Engine (`apps/ai/`)

**Files to create:**
- `apps/ai/requirements.txt` — FastAPI, uvicorn, pydantic, redis, boto3, etc.
- `apps/ai/app/main.py` — FastAPI app with health endpoint
- `apps/ai/app/api/requirements.py` — requirement analysis router stub
- `apps/ai/app/api/prd.py` — PRD generation router stub
- `apps/ai/app/api/design.py` — design generation router stub
- `apps/ai/app/api/architecture.py` — architecture generation router stub
- `apps/ai/app/api/agents.py` — agent orchestration router stub
- `apps/ai/app/api/code.py` — code generation router stub
- `apps/ai/app/agents/orchestrator.py` — orchestrator base class
- `apps/ai/app/agents/requirement_agent.py` — requirement agent stub
- `apps/ai/app/agents/prd_agent.py` — PRD agent stub
- `apps/ai/app/agents/architecture_agent.py` — architecture agent stub
- `apps/ai/app/agents/developer_agent.py` — developer agent stub
- `apps/ai/app/rag/__init__.py` — RAG module init
- `apps/ai/app/llm/__init__.py` — LLM module init
- `apps/ai/app/documents/__init__.py` — documents module init

The `main.py` will:
- Load env vars
- Connect to Redis and MinIO
- Register all routers under `/ai/v1/`
- Start uvicorn on `:8000`
- Expose `GET /health` returning 200 OK

### 1.2.5 — TypeScript Shared Packages

**Files to create:**
- `packages/types/package.json` — TypeScript types package
- `packages/types/tsconfig.json`
- `packages/types/src/index.ts` — re-export all types
- `packages/types/src/project.ts` — Project, Organization, User types
- `packages/types/src/requirement.ts` — Requirement types
- `packages/types/src/prd.ts` — PRD types
- `packages/types/src/task.ts` — Task types
- `packages/types/src/agent.ts` — AgentEvent, AgentRun types
- `packages/types/src/deployment.ts` — Deployment types

- `packages/prompts/package.json` — AI prompts package
- `packages/prompts/tsconfig.json`
- `packages/prompts/src/index.ts` — prompt templates (placeholder)

---

## Module 1.3: Local Infrastructure & CI

### 1.3.1 — Docker Compose

**File to create:** `docker-compose.yml`

Services:
- `postgres` — PostgreSQL 16 + pgvector extension, port 5432
- `redis` — Redis 7, port 6379
- `minio` — MinIO (S3-compatible), ports 9000 (API) + 9001 (Console)
- `mailhog` — MailHog, ports 1025 (SMTP) + 8025 (UI)
- `jaeger` — Jaeger all-in-one, ports 16686 (UI) + 4317 (OTLP gRPC) + 4318 (OTLP HTTP)
- `web` — Next.js dev server, port 3000
- `api` — Go API server, port 8080
- `ai` — FastAPI server, port 8000

Infrastructure-only profiles so devs can run `docker compose up postgres redis minio mailhog jaeger` without the app services during development.

**File to create:** `docker-compose.dev.yml` — override for dev mode (hot reload, volume mounts)

### 1.3.2 — MinIO & Redis Integration

Already covered in the Go and Python scaffolds above (pkg/storage/minio.go, pkg/queue/redis.go, and FastAPI equivalents). Connection configs read from environment variables pointing to Docker services.

### 1.3.3 — GitHub Actions CI

**Files to create:**
- `.github/workflows/ci.yml` — main CI pipeline

Pipeline stages:
1. **Lint & Test Web** — Node 20, pnpm, Turborepo cache, `pnpm lint`, `pnpm test`
2. **Lint & Test API** — Go 1.22, `go vet`, `go test ./...`
3. **Lint & Test AI** — Python 3.12, `ruff check`, `pytest`
4. **Schema Validation** — Validate JSON schemas and OpenAPI specs

Triggered on push to `main` and on pull requests.

---

## Module 1.4: Observability & Security Base

### 1.4.1 — OpenTelemetry Integration

**Go OTel setup (in `apps/api/`):**
- `apps/api/pkg/telemetry/otel.go` — OTel SDK init, tracer provider, export to Jaeger
- Instrument Chi middleware with OTel HTTP tracing
- Add to `main.go` initialization

**Python OTel setup (in `apps/ai/`):**
- Add `opentelemetry-*` packages to `requirements.txt`
- `apps/ai/app/telemetry.py` — OTel SDK init, FastAPI instrumentation
- Add to `main.py` startup

### 1.4.2 — Environment Variables

**File to create:** `.env.example` (root)

```
# PostgreSQL
DATABASE_URL=postgres://kairopro:kairopro@localhost:5432/kairopro

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=kairopro
MINIO_USE_SSL=false

# MailHog
SMTP_HOST=localhost
SMTP_PORT=1025

# Jaeger
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# JWT
JWT_SECRET=change-me-in-production

# App Ports
WEB_PORT=3000
API_PORT=8080
AI_PORT=8000
```

---

## File Creation Summary

### Root config (5 files)
- `package.json`
- `turbo.json`
- `.gitignore` (update)
- `.env.example`
- `.editorconfig`

### Docker (2 files)
- `docker-compose.yml`
- `docker-compose.dev.yml`

### CI (1 file)
- `.github/workflows/ci.yml`

### OpenAPI Specs (2 files)
- `apps/api/api-spec.yaml`
- `apps/ai/api-spec.yaml`

### JSON Schemas (6 files)
- `packages/schemas/project.schema.json`
- `packages/schemas/requirement.schema.json`
- `packages/schemas/prd.schema.json`
- `packages/schemas/task.schema.json`
- `packages/schemas/agent-event.schema.json`
- `packages/schemas/deployment.schema.json`

### Goose Migrations (~18 files)
- `apps/api/migrations/00001_create_users.sql` through `00018_enable_pgvector.sql`

### Next.js Web App (~10 files)
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/next.config.ts`
- `apps/web/tailwind.config.ts`
- `apps/web/postcss.config.js`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/projects/[projectId]/overview/page.tsx`

### Go API (~16 files)
- `apps/api/go.mod`
- `apps/api/cmd/server/main.go`
- `apps/api/internal/auth/handler.go`
- `apps/api/internal/projects/handler.go`
- `apps/api/internal/workspaces/handler.go`
- `apps/api/internal/sandbox/handler.go`
- `apps/api/internal/github/handler.go`
- `apps/api/internal/events/handler.go`
- `apps/api/pkg/database/postgres.go`
- `apps/api/pkg/database/config.go`
- `apps/api/pkg/storage/minio.go`
- `apps/api/pkg/storage/config.go`
- `apps/api/pkg/queue/redis.go`
- `apps/api/pkg/queue/config.go`
- `apps/api/pkg/telemetry/otel.go`

### FastAPI AI Engine (~16 files)
- `apps/ai/requirements.txt`
- `apps/ai/app/main.py`
- `apps/ai/app/api/requirements.py`
- `apps/ai/app/api/prd.py`
- `apps/ai/app/api/design.py`
- `apps/ai/app/api/architecture.py`
- `apps/ai/app/api/agents.py`
- `apps/ai/app/api/code.py`
- `apps/ai/app/agents/orchestrator.py`
- `apps/ai/app/agents/requirement_agent.py`
- `apps/ai/app/agents/prd_agent.py`
- `apps/ai/app/agents/architecture_agent.py`
- `apps/ai/app/agents/developer_agent.py`
- `apps/ai/app/rag/__init__.py`
- `apps/ai/app/llm/__init__.py`
- `apps/ai/app/documents/__init__.py`
- `apps/ai/app/telemetry.py`

### TypeScript Packages (~10 files)
- `packages/types/package.json`
- `packages/types/tsconfig.json`
- `packages/types/src/index.ts`
- `packages/types/src/project.ts`
- `packages/types/src/requirement.ts`
- `packages/types/src/prd.ts`
- `packages/types/src/task.ts`
- `packages/types/src/agent.ts`
- `packages/types/src/deployment.ts`
- `packages/prompts/package.json`
- `packages/prompts/tsconfig.json`
- `packages/prompts/src/index.ts`

---

## Verification Steps

1. **Docker Compose health check:** `docker compose up -d postgres redis minio mailhog jaeger` — all containers report healthy
2. **Go API:** `go run cmd/server/main.go` → `curl localhost:8080/health` returns 200
3. **FastAPI:** `uvicorn app.main:app --port 8000` → `curl localhost:8000/health` returns 200
4. **Next.js:** `pnpm dev` → `curl localhost:3000` returns 200
5. **MinIO connectivity:** Go and Python services log successful MinIO bucket creation
6. **Redis connectivity:** Go and Python services log successful Redis ping
7. **Postgres + pgvector:** Goose migrations run successfully, `SELECT * FROM pg_extension WHERE extname = 'vector'` returns row
8. **Jaeger traces:** Visit `localhost:16686` and see traces from Go and Python services
9. **CI pipeline:** Push to GitHub, verify Actions workflow runs lint + test across all 3 services
10. **Swagger UI:** OpenAPI specs render correctly in Swagger UI

---

## Implementation Order

1. Root config files (package.json, turbo.json, .gitignore, .env.example, .editorconfig)
2. Docker Compose (docker-compose.yml, docker-compose.dev.yml)
3. Database migrations (Goose SQL files)
4. Go API scaffold (go.mod, main.go, handlers, pkg helpers, OTel)
5. FastAPI AI scaffold (requirements.txt, main.py, routers, agents, OTel)
6. Next.js web scaffold (package.json, configs, pages)
7. TypeScript packages (types, schemas, prompts)
8. OpenAPI specs (api-spec.yaml for both services)
9. GitHub Actions CI (ci.yml)
10. Verification — run everything, confirm health checks
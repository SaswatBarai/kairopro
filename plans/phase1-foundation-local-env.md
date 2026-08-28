# Phase 1: Foundation & Local Environment — Implementation Plan

## Overview

Establish the monorepo, local Docker dev environment, and CI pipelines. End state: Next.js (frontend + backend API routes) and FastAPI (AI engine) both respond with 200 OK, connected to PostgreSQL+pgvector, Redis, MinIO, and MailHog via Docker Compose.

**Key decisions:**
- Backend: **Next.js App Router API Routes** (no separate Go service)
- ORM: **Prisma** (TypeScript-native, replaces Goose migrations)
- Monorepo: **Turborepo**
- Auth: **NextAuth.js** (added in Phase 2; scaffolded here)
- AI Engine: **FastAPI** (Python, internal service only)

---

## Module 1.1: System Schemas & Contracts

### 1.1.1 — OpenAPI Specs

**Files to create:**
- `apps/web/api-spec.yaml` — Next.js platform API spec
- `apps/ai/api-spec.yaml` — FastAPI AI engine spec

**Next.js API routes:**
```
POST   /api/projects
GET    /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/files
GET    /api/projects/:id/files
POST   /api/projects/:id/analyze
POST   /api/projects/:id/prd
POST   /api/projects/:id/design
POST   /api/projects/:id/sandbox/exec
POST   /api/projects/:id/deploy
GET    /api/projects/:id/events      ← SSE stream
GET    /api/projects/:id/tasks
POST   /api/auth/[...nextauth]
```

**FastAPI AI routes (internal only):**
```
POST /ai/analyze
POST /ai/prd
POST /ai/design
POST /ai/architecture
POST /ai/code
POST /ai/debug
POST /ai/embed
POST /ai/search
GET  /ai/status/:run_id
```

### 1.1.2 — Shared JSON Schemas

**Files to create in `packages/schemas/`:**
- `project.schema.json`
- `requirement.schema.json`
- `prd.schema.json`
- `task.schema.json`
- `agent-event.schema.json`
- `deployment.schema.json`

### 1.1.3 — Prisma Schema (replaces SQL migrations)

**File:** `apps/web/prisma/schema.prisma`

Core models:
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  image         String?
  emailVerified DateTime?
  accounts      Account[]
  sessions      Session[]
  projects      Project[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  ownerId   String
  members   OrganizationMember[]
  projects  Project[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Project {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  slug           String
  description    String?
  state          String   @default("draft")
  createdById    String
  organization   Organization @relation(fields: [organizationId], references: [id])
  documents      Document[]
  requirements   Requirement[]
  prdVersions    PRDVersion[]
  agentRuns      AgentRun[]
  workspace      Workspace?
  deployments    Deployment[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Document {
  id               String   @id @default(cuid())
  projectId        String
  filename         String
  contentType      String
  storagePath      String
  processingStatus String   @default("pending")
  project          Project  @relation(fields: [projectId], references: [id])
  chunks           DocumentChunk[]
  createdAt        DateTime @default(now())
}

model DocumentChunk {
  id         String   @id @default(cuid())
  documentId String
  projectId  String
  chunkIndex Int
  content    String
  tokenCount Int?
  metadata   Json     @default("{}")
  document   Document @relation(fields: [documentId], references: [id])
  // embedding stored in pgvector via raw SQL
  createdAt  DateTime @default(now())
}
```

> Note: The `embedding vector(1536)` column on `document_chunks` is added via a raw SQL migration since Prisma does not natively support pgvector. Use `prisma db execute --file migrations/pgvector.sql` after `prisma migrate deploy`.

---

## Module 1.2: Repository Setup & Local Dev

### 1.2.1 — Monorepo Root Config

**Files to create:**
- `package.json` — root monorepo with Turborepo
- `turbo.json` — pipeline: build, dev, lint, test
- `pnpm-workspace.yaml` — workspace packages
- `.gitignore` — Node, Python, IDE, OS patterns
- `.env.example` — all environment variables documented
- `.editorconfig`

### 1.2.2 — Next.js App (`apps/web/`)

**Files to create:**
- `apps/web/package.json` — Next.js 14+, TypeScript, Tailwind, shadcn/ui, Prisma, NextAuth, BullMQ
- `apps/web/tsconfig.json`
- `apps/web/next.config.ts`
- `apps/web/tailwind.config.ts`
- `apps/web/postcss.config.js`
- `apps/web/prisma/schema.prisma` — full Prisma schema
- `apps/web/lib/db.ts` — Prisma client singleton
- `apps/web/lib/redis.ts` — Redis + BullMQ client
- `apps/web/lib/storage.ts` — MinIO/S3 SDK client
- `apps/web/lib/docker.ts` — Docker SDK client (dockerode)
- `apps/web/lib/ai-client.ts` — HTTP client → FastAPI (with service token)
- `apps/web/app/layout.tsx` — root layout
- `apps/web/app/page.tsx` — landing page (hello world)
- `apps/web/app/(auth)/login/page.tsx` — login placeholder
- `apps/web/app/dashboard/page.tsx` — dashboard placeholder
- `apps/web/app/projects/[projectId]/overview/page.tsx` — placeholder
- `apps/web/app/api/health/route.ts` — `GET /api/health` returns 200 OK
- `apps/web/middleware.ts` — route protection placeholder

**`lib/db.ts` pattern:**
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

**`lib/ai-client.ts` pattern:**
```typescript
const AI_BASE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN!

export async function callAI(path: string, body: unknown) {
  const res = await fetch(`${AI_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Token': AI_SERVICE_TOKEN,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`AI service error: ${res.status}`)
  return res.json()
}
```

### 1.2.3 — FastAPI AI Engine (`apps/ai/`)

**Files to create:**
- `apps/ai/requirements.txt` — fastapi, uvicorn, pydantic, redis, boto3, psycopg2, openai, etc.
- `apps/ai/app/main.py` — FastAPI app with health endpoint
- `apps/ai/app/middleware.py` — service token auth middleware
- `apps/ai/app/api/requirements.py` — requirement analysis router stub
- `apps/ai/app/api/prd.py` — PRD generation router stub
- `apps/ai/app/api/design.py` — design generation router stub
- `apps/ai/app/api/architecture.py` — architecture router stub
- `apps/ai/app/api/code.py` — code generation router stub
- `apps/ai/app/api/documents.py` — document processing router stub
- `apps/ai/app/agents/orchestrator.py` — orchestrator stub
- `apps/ai/app/agents/requirement_agent.py` — stub
- `apps/ai/app/agents/prd_agent.py` — stub
- `apps/ai/app/agents/architecture_agent.py` — stub
- `apps/ai/app/agents/developer_agent.py` — stub
- `apps/ai/app/rag/__init__.py`
- `apps/ai/app/llm/__init__.py`
- `apps/ai/app/documents/__init__.py`

**`main.py` startup:**
- Load env vars
- Register all routers under `/ai/`
- Auth middleware: validate `X-Service-Token` header on all routes
- Start uvicorn on `:8000`
- Expose `GET /health` returning 200 OK

### 1.2.4 — TypeScript Shared Packages

**Files to create:**
- `packages/types/package.json`
- `packages/types/tsconfig.json`
- `packages/types/src/index.ts`
- `packages/types/src/project.ts` — Project, Organization, User types
- `packages/types/src/requirement.ts`
- `packages/types/src/prd.ts`
- `packages/types/src/task.ts`
- `packages/types/src/agent.ts` — AgentEvent, AgentRun types
- `packages/types/src/deployment.ts`
- `packages/prompts/package.json`
- `packages/prompts/src/index.ts` — prompt template exports

---

## Module 1.3: Local Infrastructure & CI

### 1.3.1 — Docker Compose

**File:** `docker-compose.yml`

Services:
- `postgres` — PostgreSQL 16 + pgvector extension, port 5432
- `redis` — Redis 7, port 6379
- `minio` — MinIO, ports 9000 (API) + 9001 (Console)
- `mailhog` — MailHog, ports 1025 (SMTP) + 8025 (UI)
- `jaeger` — Jaeger all-in-one, ports 16686 (UI) + 4317/4318 (OTLP)

App services (optional profile for running everything in Docker):
- `web` — Next.js on port 3000
- `ai` — FastAPI on port 8000

Infrastructure services started independently during local dev:
```bash
docker compose up postgres redis minio mailhog jaeger -d
```

Apps run natively:
```bash
cd apps/web && pnpm dev       # :3000
cd apps/ai  && uvicorn app.main:app --reload  # :8000
```

**File:** `docker-compose.dev.yml` — hot-reload volume mounts override

### 1.3.2 — Redis + BullMQ Integration

**File:** `apps/web/lib/redis.ts`

```typescript
import { Redis } from 'ioredis'
import { Queue, Worker } from 'bullmq'

export const redis = new Redis(process.env.REDIS_URL!)

export const documentQueue = new Queue('document-processing', { connection: redis })
export const aiAnalysisQueue = new Queue('ai-analysis', { connection: redis })
export const deploymentQueue = new Queue('deployment', { connection: redis })
```

### 1.3.3 — MinIO Integration

**File:** `apps/web/lib/storage.ts`

```typescript
import { S3Client } from '@aws-sdk/client-s3'

export const storage = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,       // http://localhost:9000
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  region: 'us-east-1',
  forcePathStyle: true,
})
```

### 1.3.4 — GitHub Actions CI

**File:** `.github/workflows/ci.yml`

Pipeline stages:
1. **Lint & Type-check Web** — Node 20, pnpm, `pnpm lint`, `pnpm tsc --noEmit`
2. **Test Web** — `pnpm test`
3. **Lint & Test AI** — Python 3.12, `ruff check`, `pytest`
4. **Schema Validation** — Validate JSON schemas and OpenAPI specs
5. **Docker Build Smoke Test** — Build both Dockerfiles

Triggered on push to `main` and pull requests.

---

## Module 1.4: Observability & Security Base

### 1.4.1 — OpenTelemetry

**Next.js OTel setup:**
- `apps/web/instrumentation.ts` — OTel SDK init (Next.js instrumentation hook)
- Traces exported to Jaeger at `localhost:4317`

**Python OTel setup:**
- Add `opentelemetry-*` packages to `requirements.txt`
- `apps/ai/app/telemetry.py` — OTel SDK init + FastAPI auto-instrumentation

### 1.4.2 — Environment Variables

**File:** `.env.example`

```env
# PostgreSQL
DATABASE_URL=postgresql://kairopro:kairopro@localhost:5432/kairopro

# Redis
REDIS_URL=redis://localhost:6379

# MinIO (local S3)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=kairopro
AWS_REGION=us-east-1

# MailHog
SMTP_HOST=localhost
SMTP_PORT=1025

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change-me-in-production

# FastAPI service token (shared secret)
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TOKEN=dev-internal-token

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# OpenAI
OPENAI_API_KEY=

# OTel
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

---

## File Summary

### Root config
- `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `.gitignore`, `.env.example`, `.editorconfig`

### Docker
- `docker-compose.yml`, `docker-compose.dev.yml`

### CI
- `.github/workflows/ci.yml`

### OpenAPI Specs
- `apps/web/api-spec.yaml`, `apps/ai/api-spec.yaml`

### JSON Schemas (6 files)
- `packages/schemas/{project,requirement,prd,task,agent-event,deployment}.schema.json`

### Next.js Web App
- `apps/web/package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`
- `apps/web/prisma/schema.prisma`
- `apps/web/lib/{db,redis,storage,docker,ai-client}.ts`
- `apps/web/app/{layout,page}.tsx`, placeholder pages
- `apps/web/app/api/health/route.ts`
- `apps/web/middleware.ts`, `instrumentation.ts`

### FastAPI AI Engine
- `apps/ai/requirements.txt`, `app/main.py`, `app/middleware.py`
- `app/api/{requirements,prd,design,architecture,code,documents}.py`
- `app/agents/{orchestrator,requirement_agent,prd_agent,architecture_agent,developer_agent}.py`
- `app/{rag,llm,documents}/__init__.py`, `app/telemetry.py`

### TypeScript Packages
- `packages/types/src/{index,project,requirement,prd,task,agent,deployment}.ts`
- `packages/prompts/src/index.ts`

---

## Verification Steps

1. `docker compose up postgres redis minio mailhog jaeger -d` — all containers healthy
2. `prisma migrate dev` — migrations apply; `SELECT * FROM pg_extension WHERE extname = 'vector'` returns row
3. `pnpm dev` (Next.js) → `curl localhost:3000/api/health` returns `{"status":"ok"}`
4. `uvicorn app.main:app` (FastAPI) → `curl localhost:8000/health` returns `{"status":"ok"}`
5. `curl -H "X-Service-Token: wrong" localhost:8000/ai/analyze` → 401 Unauthorized
6. MinIO console at `localhost:9001` — bucket `kairopro` created on startup
7. Jaeger UI at `localhost:16686` — traces visible from both services
8. CI push → GitHub Actions lint + test passes

---

## Implementation Order

1. Root config files (package.json, turbo.json, pnpm-workspace, .env.example)
2. Docker Compose
3. Prisma schema + `prisma migrate dev` + pgvector SQL migration
4. Next.js scaffold (configs, lib helpers, placeholder pages, health route)
5. FastAPI scaffold (main.py, routers stubs, service token middleware)
6. TypeScript packages (types, schemas, prompts)
7. OTel setup (both services)
8. GitHub Actions CI
9. Verification
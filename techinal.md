# KairoPro Technical Design

**Domain:** `kairopro.in`

```text
                        KAIROPRO
                           │
          ┌────────────────┴────────────────┐
          │                                 │
          ▼                                 ▼
     Next.js App                    FastAPI AI Engine
  (Frontend + Backend)               (AI Only)
          │                                 │
          ▼                                 ▼
   /app  (UI Pages)              /agents (orchestrator)
   /app/api (API Routes)         /api    (endpoints)
   NextAuth.js                   /llm    (model wrappers)
   Prisma ORM                    /rag    (retrieval)
          │                      /documents (parsers)
          ▼
   PostgreSQL + pgvector
   Redis / BullMQ
   MinIO / S3
   Docker SDK
   GitHub API
```

---

# 1. Technology Stack

| Layer | Technology |
|---|---|
| Web UI | Next.js 14+ (App Router) + TypeScript |
| UI library | Tailwind CSS + shadcn/ui |
| Code editor | Monaco Editor |
| Terminal UI | Xterm.js + WebSocket |
| Platform backend | Next.js API Routes (App Router) |
| Auth | NextAuth.js (Email, Google, GitHub) |
| ORM | Prisma |
| AI backend | Python 3.12 + FastAPI |
| AI orchestration | Python (custom agent framework) |
| LLM | OpenAI / Anthropic / Google (pluggable) |
| Primary DB | PostgreSQL 16 |
| Vector search | pgvector |
| Cache | Redis |
| Job queue | BullMQ (local) / SQS (prod) |
| Object storage | MinIO (local) / S3 (prod) |
| Containerization | Docker |
| Container registry | Amazon ECR |
| Runtime | AWS ECS / Fargate |
| DNS | Route 53 |
| CDN | CloudFront |
| Load balancer | ALB |
| Secrets | AWS Secrets Manager |
| Logs | CloudWatch |
| Metrics | OpenTelemetry |
| IaC | Terraform |
| CI/CD | GitHub Actions |
| Email | Resend / SES |

---

# 2. Why Two Services?

**Do not split Next.js further — it handles all platform control.**
**FastAPI handles only AI/ML work.**

### Next.js (Platform Control Plane)

Responsible for:
- All UI pages and components
- All platform API routes (`/api/*`)
- Authentication and session management (NextAuth.js)
- Project, organization, file management
- GitHub integration
- Sandbox/container lifecycle management
- WebSocket / SSE gateway for event streaming
- Deployment engine (builds, ECR push, ECS updates)
- Billing, secrets, audit logs

### FastAPI (AI Engine)

Responsible for:
- LLM calls (wrapped behind pluggable providers)
- Requirement extraction
- Document parsing (PDF, DOCX, Markdown, Images/OCR)
- RAG (embedding, retrieval, pgvector queries)
- PRD generation
- Design reasoning
- Architecture generation
- Code planning and generation
- Test generation
- AI debugging

**The browser never calls FastAPI directly. All traffic goes through Next.js.**

---

# 3. High-Level Architecture

```text
                        INTERNET
                           │
                           ▼
                    ┌─────────────┐
                    │ CloudFront  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │     ALB     │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Next.js   │  ← single entry point
                    │  (UI + API) │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         PostgreSQL       Redis     FastAPI AI
         pgvector        BullMQ      Engine
         Prisma            │            │
                      Job Workers    LLM APIs
                           │
                           ▼
                    Docker Sandbox
                    (per project)
```

---

# 4. Monorepo Structure

```text
kairopro/
│
├── apps/
│   ├── web/                        # Next.js (Frontend + Backend)
│   │   ├── app/
│   │   │   ├── (auth)/             # Login, Signup pages
│   │   │   ├── dashboard/          # Project listing
│   │   │   ├── projects/
│   │   │   │   └── [projectId]/
│   │   │   │       ├── overview/
│   │   │   │       ├── prd/
│   │   │   │       ├── design/
│   │   │   │       ├── architecture/
│   │   │   │       ├── build/
│   │   │   │       ├── code/
│   │   │   │       ├── preview/
│   │   │   │       └── deployments/
│   │   │   └── api/                # All API routes
│   │   │       ├── auth/[...nextauth]/
│   │   │       ├── projects/
│   │   │       ├── files/
│   │   │       ├── sandbox/
│   │   │       ├── deploy/
│   │   │       ├── github/
│   │   │       ├── ai/             # Next.js proxies to FastAPI
│   │   │       └── events/         # SSE stream endpoint
│   │   ├── components/
│   │   │   ├── editor/             # Monaco Editor
│   │   │   ├── terminal/           # Xterm.js
│   │   │   ├── ai-chat/
│   │   │   ├── file-tree/
│   │   │   ├── preview/
│   │   │   ├── prd/
│   │   │   └── deployment/
│   │   ├── lib/
│   │   │   ├── db.ts               # Prisma client
│   │   │   ├── redis.ts            # Redis / BullMQ
│   │   │   ├── storage.ts          # MinIO / S3 SDK
│   │   │   ├── docker.ts           # Docker SDK
│   │   │   ├── github.ts           # GitHub API client
│   │   │   └── ai-client.ts        # HTTP client → FastAPI
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── middleware.ts           # NextAuth + RBAC
│   │
│   └── ai/                         # FastAPI AI Engine
│       ├── app/
│       │   ├── main.py
│       │   ├── api/
│       │   │   ├── requirements.py
│       │   │   ├── prd.py
│       │   │   ├── design.py
│       │   │   ├── architecture.py
│       │   │   ├── code.py
│       │   │   └── documents.py
│       │   ├── agents/
│       │   │   ├── orchestrator.py
│       │   │   ├── requirement_agent.py
│       │   │   ├── prd_agent.py
│       │   │   ├── design_agent.py
│       │   │   ├── architecture_agent.py
│       │   │   ├── developer_agent.py
│       │   │   ├── testing_agent.py
│       │   │   └── debug_agent.py
│       │   ├── llm/
│       │   │   ├── provider.py      # Pluggable interface
│       │   │   ├── openai.py
│       │   │   ├── anthropic.py
│       │   │   └── google.py
│       │   ├── rag/
│       │   │   ├── embeddings.py
│       │   │   ├── retriever.py
│       │   │   └── vector_store.py
│       │   └── documents/
│       │       ├── pdf.py
│       │       ├── docx.py
│       │       ├── markdown.py
│       │       └── images.py        # OCR + Vision
│       └── requirements.txt
│
├── packages/
│   ├── types/                       # Shared TypeScript types
│   ├── schemas/                     # JSON Schemas / Zod
│   └── prompts/                     # Shared AI prompt templates
│
├── infrastructure/
│   ├── terraform/
│   └── ecs/
│
├── scripts/
│
└── docker-compose.yml               # Local dev environment
```

---

# 5. Next.js API Routes

```text
POST   /api/auth/[...nextauth]         # NextAuth handlers

POST   /api/projects                   # Create project
GET    /api/projects                   # List projects
GET    /api/projects/:id               # Get project
PATCH  /api/projects/:id               # Update project
DELETE /api/projects/:id               # Delete project

POST   /api/projects/:id/files         # Upload file → S3
GET    /api/projects/:id/files         # List files

POST   /api/projects/:id/analyze       # Trigger FastAPI → Requirement Agent
POST   /api/projects/:id/prd           # Trigger FastAPI → PRD Agent
PATCH  /api/projects/:id/prd           # Save PRD edits
POST   /api/projects/:id/design        # Trigger FastAPI → Design Agent
POST   /api/projects/:id/architecture  # Trigger FastAPI → Architecture Agent

POST   /api/projects/:id/sandbox       # Create/start sandbox container
DELETE /api/projects/:id/sandbox       # Stop sandbox
POST   /api/projects/:id/sandbox/exec  # Execute command in sandbox

POST   /api/projects/:id/build         # Build production Docker image
POST   /api/projects/:id/deploy        # Deploy to ECS

GET    /api/projects/:id/logs          # Stream logs
GET    /api/projects/:id/events        # SSE event stream
GET    /api/projects/:id/tasks         # List AI tasks

POST   /api/github/connect             # GitHub OAuth
POST   /api/github/sync                # Push to GitHub
```

---

# 6. FastAPI AI Endpoints (internal only)

```text
POST /ai/analyze        # Requirement extraction
POST /ai/prd            # PRD generation
POST /ai/design         # Design generation
POST /ai/architecture   # Architecture generation
POST /ai/plan           # Break architecture into task graph
POST /ai/code           # Generate/modify a specific file
POST /ai/debug          # Analyze error and propose fix
POST /ai/embed          # Generate embeddings for a document
POST /ai/search         # Semantic search in pgvector
```

All endpoints require an **internal service token** header.
Response format: structured JSON or chunked streaming (NDJSON).

---

# 7. Agent Architecture

```text
              ORCHESTRATOR
                   │
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
Requirement      Design     Architecture
  Agent           Agent        Agent
     │             │             │
     └─────────────┼─────────────┘
                   ▼
            Developer Agent
                   │
                   ▼
              Test Agent
                   │
                   ▼
             Debug Agent
```

Every agent has a defined contract:

```text
INPUT:  Structured JSON payload
OUTPUT: Structured JSON (never raw prose internally)
```

---

# 8. Agent State Machine

State persisted in PostgreSQL, managed by Next.js API:

```text
PROJECT_CREATED → ANALYZING → CLARIFICATION_REQUIRED →
PRD_GENERATED → PRD_APPROVED → DESIGN_GENERATED →
DESIGN_APPROVED → ARCHITECTURE_APPROVED →
DEVELOPMENT → TESTING → PREVIEW →
DEPLOYMENT → LIVE
```

---

# 9. AI Tool System

FastAPI agents are given controlled tools. Next.js API implements them:

```text
Tool                  Executor
────────────────────────────────────
read_file()          → Next.js Sandbox API
write_file()         → Next.js Sandbox API
edit_file()          → Next.js Sandbox API
list_files()         → Next.js Sandbox API
run_command()        → Next.js Sandbox API (exec in container)
run_tests()          → Next.js Sandbox API
run_build()          → Next.js Sandbox API
git_diff()           → Next.js Sandbox API
search_knowledge()   → pgvector via Next.js API
request_approval()   → Next.js notification to user
```

FastAPI **never has direct shell access** — everything is mediated by Next.js API routes.

---

# 10. AI Structured Output

Agents always return typed schemas, never prose:

```typescript
// Requirement
{
  id: string
  title: string
  description: string
  priority: "HIGH" | "MEDIUM" | "LOW"
  confidence: number // 0-100
  source: string
}

// Code Task
{
  id: string
  title: string
  filePath: string
  action: "CREATE" | "MODIFY" | "DELETE"
  dependencies: string[]
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
}

// File Change
{
  path: string
  action: "CREATE" | "MODIFY" | "DELETE"
  content: string
  explanation: string
}
```

---

# 11. PostgreSQL Schema (Core Tables)

```sql
-- Identity
users, organizations, organization_members

-- Projects
projects (id, org_id, name, state, created_at)

-- Knowledge Base
documents (id, project_id, type, s3_key, status)
document_chunks (id, doc_id, content, embedding vector(1536))

-- AI Artifacts
requirements (id, project_id, title, description, confidence, priority)
prd_versions (id, project_id, content_json, version, created_at)
design_versions (id, project_id, spec_json, version)
architecture_versions (id, project_id, spec_json, version)

-- Development
tasks (id, project_id, title, status, dependencies jsonb)
agent_runs (id, project_id, agent_type, status, started_at, ended_at)
agent_events (id, run_id, type, payload jsonb, created_at)

-- Workspace
workspaces (id, project_id, container_id, status)
workspace_files (id, workspace_id, path, s3_key)

-- Deployment
builds (id, project_id, status, image_uri, created_at)
deployments (id, project_id, env, build_id, status, url)
environments (id, project_id, name, variables jsonb)
secrets (id, project_id, env, key, secret_arn)

-- GitHub
repositories (id, project_id, github_repo_id, full_name)

-- Billing
audit_logs, usage_records
```

---

# 12. Redis / BullMQ Job Queues

```text
Queue                   Worker
────────────────────────────────────────
document-processing  →  FastAPI: parse + embed
ai-analysis          →  FastAPI: requirement extraction
code-generation      →  FastAPI: developer agent
testing              →  Next.js: run tests in sandbox
building             →  Next.js: docker build
deployment           →  Next.js: ECR push + ECS update
```

---

# 13. Event Streaming

```text
FastAPI Agent emits event
  ↓
Redis Pub/Sub channel (project:{id}:events)
  ↓
Next.js SSE route (/api/projects/:id/events)
  ↓
Browser (EventSource)
```

Event types:
```text
agent.started | agent.thinking | agent.completed
file.created | file.modified | file.deleted
command.output | test.passed | test.failed
build.started | build.completed | build.failed
deployment.started | deployment.live | deployment.failed
```

---

# 14. Sandbox Architecture

```text
Next.js API (Docker SDK)
  │
  ├── Create container per project workspace
  ├── Mount volume: /workspaces/{project-id}/
  ├── Exec: npm install, npm run dev, npm test
  ├── Stream stdout/stderr → Redis → SSE → Browser
  └── Expose port → Next.js reverse proxy → preview URL

Limits per container:
  CPU:    1 vCPU
  Memory: 2 GB
  Disk:   10 GB
  Timeout: configurable per operation
```

---

# 15. Preview Architecture

```text
Browser → https://{id}.preview.kairopro.in
  ↓
Next.js reverse proxy middleware
  ↓
Sandbox container port 3000
```

---

# 16. Production Deployment Flow

```text
User clicks Deploy (Next.js UI)
  ↓
POST /api/projects/:id/deploy  (Next.js API Route)
  ↓
BullMQ deployment job enqueued
  ↓
Deployment worker:
  1. docker build -t app .  (in sandbox)
  2. docker push → ECR
  3. Register new ECS task definition
  4. Update ECS service
  5. Poll health checks
  6. Update Route 53 if needed
  7. Emit deployment.live event
  ↓
User notified via SSE + Email
```

---

# 17. Authentication Architecture

```text
Browser → NextAuth.js (Next.js middleware)
  │
  ├── Email/password (credentials provider)
  ├── Google OAuth
  └── GitHub OAuth

Sessions → JWT stored as HTTP-only cookie
RBAC enforcement → Next.js middleware.ts
```

FastAPI receives an **internal service token** (env var), not user sessions.

---

# 18. Security Boundaries

```text
PUBLIC           INTERNAL ONLY
────────         ──────────────────
Next.js          FastAPI (no public route)
PostgreSQL       Docker socket
Redis            AWS APIs
S3 signed URLs   GitHub tokens
```

Sandbox containers:
- No KairoPro credentials
- No FastAPI access
- Network restricted to outbound package registries only
- Non-root execution

---

# 19. Observability

- **OpenTelemetry** SDK in both Next.js and FastAPI
- Traces exported to Jaeger (local) / CloudWatch X-Ray (prod)
- Structured JSON logs
- Metrics: request latency, LLM token usage, build times, sandbox resource usage

---

# 20. Local Development Stack

`docker-compose.yml` services:

```text
postgres:16          → localhost:5432
redis:7              → localhost:6379
minio/minio          → localhost:9000 (API), 9001 (console)
mailhog              → localhost:1025 (SMTP), 8025 (UI)
```

Apps started manually:
```bash
cd apps/web && npm run dev    # Next.js on :3000
cd apps/ai  && uvicorn app.main:app --reload  # FastAPI on :8000
```

---

# 21. CI/CD Pipeline

```text
Push to PR
  ↓
GitHub Actions:
  - npm run lint (Next.js)
  - npm run test (Next.js)
  - pytest (FastAPI)
  - docker build (smoke test)
  ↓
Pass → merge allowed

Push to main → deploy staging
Push tag vX.Y.Z → deploy production (Terraform + ECS)
```

---

# 22. Core Design Principles

1. **Next.js is the single control plane.** All security decisions, infrastructure operations, and API boundaries live here.
2. **FastAPI is stateless.** It holds no project state — all persistence goes through Next.js API to PostgreSQL.
3. **Pluggable AI providers.** LLM, embedding, and vector store are behind interfaces so providers can be swapped.
4. **Agents have defined contracts.** Input/output schemas are strict — no free-form prose returned internally.
5. **Sandbox isolation.** AI-generated code never executes on the KairoPro host — only in per-project containers.
6. **Git as history.** Every meaningful AI operation maps to a git commit for rollback capability.

# KairoPro — Product Requirements Document

**Product:** KairoPro | **Domain:** `kairopro.in`
**Vision:** Turn an idea, documents, and designs into a tested, deployable production application.

> **Describe it. Build it. Ship it.**

---

# 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript |
| Backend API | Next.js API Routes (App Router) |
| Auth | NextAuth.js |
| AI Engine | FastAPI (Python) |
| Database | PostgreSQL + pgvector |
| Cache / Queue | Redis + BullMQ |
| Object Storage | MinIO (local) / S3 (prod) |
| Code Editor | Monaco Editor |
| Terminal UI | Xterm.js + WebSocket |
| IaC | Terraform |
| CI/CD | GitHub Actions |

**One Next.js app serves both the UI and the platform backend.**
**FastAPI is the dedicated AI service — no UI, no project management, AI only.**

---

# 2. Architecture Overview

```text
Browser
  │
  ▼
Next.js (Frontend + API Routes)
  │                  │
  ▼                  ▼
PostgreSQL        FastAPI AI Engine
Redis             (internal calls only)
MinIO / S3            │
GitHub API        LLM / RAG / Agents
Docker SDK        pgvector queries
```

The browser **never calls FastAPI directly**. Next.js is the single security boundary.

---

# 3. Vision

```text
Idea → Requirements → PRD → Design → Architecture
→ Code → Testing → Debugging → Deployment → Live Product
```

---

# 4. Goals

Users must be able to:

1. Create a project and describe their idea
2. Upload supporting files (PDF, DOCX, MD, images)
3. Have AI analyze inputs and ask clarification questions
4. Generate and edit a structured PRD
5. Review and approve design options
6. Generate and approve architecture
7. Watch AI write, test, and debug code in real time
8. View a live preview of the running application
9. Connect GitHub and sync generated code
10. Deploy to production with a single click
11. Access the live application at a custom URL

---

# 5. Non-Goals (MVP)

- Full Kubernetes support
- Multi-cloud (AWS only for MVP)
- Every programming language
- Full Figma integration

---

# 6. Target Users

| Persona | Key Needs |
|---|---|
| Founder | Easy input, visual feedback, working app |
| Developer | Code editor, terminal, GitHub, deployment |
| Product Manager | Requirement validation, PRD generation |
| Designer | Accurate UI, design iteration, preview |

---

# 7. Core User Journey

```text
Create Project
  ↓
Enter Problem Statement + Upload Files
  ↓
Next.js API → FastAPI Requirement Agent
  ↓
AI Clarification Questions (Next.js UI)
  ↓
FastAPI PRD Agent → Stored by Next.js API
  ↓
User Edits & Approves PRD
  ↓
FastAPI Design Agent → 3 design options
  ↓
User Approves Design
  ↓
FastAPI Architecture Agent
  ↓
User Approves Architecture
  ↓
FastAPI Developer Agent → writes code via Next.js Sandbox API
  ↓
AI Test + Debug Loop
  ↓
Live Preview (Next.js proxy)
  ↓
User Review → Deploy
  ↓
Next.js Deployment API → ECS/Fargate
  ↓
Live Application
```

---

# 8. Authentication

- Email/password, Google, GitHub via **NextAuth.js**
- JWT sessions stored in Next.js middleware
- RBAC: Owner, Admin, Developer, Designer, Viewer

---

# 9. Dashboard

```text
┌──────────────────────────────────────────┐
│ KairoPro                     [+ New App] │
├──────────────────────────────────────────┤
│ ┌────────────────┐  ┌────────────────┐   │
│ │ Employee App   │  │ Food Delivery  │   │
│ │ ● LIVE         │  │ ⟳ BUILDING     │   │
│ └────────────────┘  └────────────────┘   │
└──────────────────────────────────────────┘
```

---

# 10. File Processing Pipeline

```text
Upload → Next.js API Route
  ↓
Store in MinIO/S3
  ↓
Enqueue job (Redis/BullMQ)
  ↓
FastAPI Worker picks up job
  ↓
Parse PDF/DOCX/MD/Image (OCR)
  ↓
Chunk + Embed (OpenAI/Anthropic)
  ↓
Store in pgvector (Project Knowledge Base)
```

---

# 11. Requirement Analysis

FastAPI extracts:
- Business, functional, non-functional requirements
- User roles and journeys
- UI, technical, security, data requirements

Each requirement has a **confidence score**. Low confidence triggers clarification questions shown in the Next.js UI.

---

# 12. PRD Generation & Editing

FastAPI PRD Agent generates:
- Product overview, personas, features
- Business rules, functional/non-functional requirements
- Security and integration requirements

The PRD is stored and versioned by the **Next.js API**. Users edit it in the Next.js UI. Every change creates a new version.

---

# 13. Design Generation

FastAPI Design Agent produces 3 design directions (Modern SaaS, Minimal Enterprise, Dark Premium), each with:
- Color system, typography, spacing
- Component library definition
- Layout specifications (dashboard, nav, forms, tables, mobile)

Users can also upload screenshots for AI to extract design tokens from.

---

# 14. Architecture Generation

FastAPI Architecture Agent maps PRD to:
- Next.js pages and API routes
- Database schema (PostgreSQL)
- External integrations (auth, storage, email)

User approves before coding begins.

---

# 15. KairoPro IDE

```text
┌────────────┬──────────────────────┬────────────────┐
│ File Tree  │ Monaco Code Editor   │ Live Preview   │
│            │                      │                │
│ app/       │ app/page.tsx         │   Running App  │
│ api/       │                      │                │
│ db/        │                      │                │
├────────────┴──────────────────────┴────────────────┤
│ Terminal (Xterm.js) / AI Activity / Logs            │
├─────────────────────────────────────────────────────┤
│ Ask KairoPro...                          [Send]     │
└─────────────────────────────────────────────────────┘
```

- Monaco Editor for code viewing/editing
- Xterm.js terminal connected via WebSocket to Next.js API
- Live preview via Next.js reverse proxy to sandbox container

---

# 16. AI Development Loop

```text
FastAPI Developer Agent
  ↓
Writes code plan
  ↓
Calls Next.js Sandbox API → writes files to container
  ↓
Calls Next.js Sandbox API → runs build/tests
  ↓
Read stdout/stderr
  ↓
Error? → FastAPI Debug Agent → fix → retry (max 5)
  ↓
Pass → Next task
  ↓
All tasks done → Preview ready
```

---

# 17. Sandbox Security

Next.js API controls all sandbox operations:
- CPU, memory, disk limits per container
- Network restrictions
- Process isolation
- No access to KairoPro secrets or DB credentials

---

# 18. GitHub Integration

- OAuth via NextAuth GitHub provider
- Next.js API handles: clone, read, commit, push, create PR
- Webhooks received at Next.js API route → FastAPI analyzes impact

---

# 19. Deployment Pipeline

```text
User clicks Deploy
  ↓
Next.js API → Docker build in sandbox
  ↓
Push image to Amazon ECR
  ↓
Next.js API → Create/update ECS task definition
  ↓
Health check monitoring
  ↓
ALB + Route 53
  ↓
https://myapp.kairopro.in
```

Rollback: Next.js API reverts ECS service to previous task definition.

---

# 20. Events & Streaming

FastAPI agents emit events → Redis pub/sub → Next.js API streams to browser via SSE/WebSocket.

```text
agent.started | agent.thinking | file.created | file.updated
command.started | test.passed | test.failed | build.completed
deployment.started | deployment.completed
```

---

# 21. Project State Machine

```text
DRAFT → ANALYZING → CLARIFICATION → PRD_READY →
DESIGNING → DESIGN_READY → ARCHITECTURE_READY →
APPROVED → DEVELOPING → TESTING → PREVIEW →
DEPLOYING → LIVE
```

State persisted in PostgreSQL, managed by Next.js API.

---

# 22. Key Database Tables

```text
users, organizations, organization_members
projects, project_states
documents, document_chunks (pgvector)
requirements, prd_versions
design_versions, architecture_versions
tasks, agent_runs, agent_events
workspaces, workspace_files
builds, test_runs
deployments, environments
domains, secrets, audit_logs
```

---

# 23. Notifications

Email (Resend / SES) triggered by Next.js API on:
- Deployment success/failure
- Build failure
- Agent blocked — user action required
- Clarification questions ready

---

# 24. Environment Management

Each project has **Development**, **Preview**, and **Production** environments, each with independent variables, secrets (AWS Secrets Manager in prod), and database configs.

---

# 25. Billing

Next.js API tracks usage (compute, AI tokens, storage, deployments).

Plans: Free → Pro → Team → Enterprise

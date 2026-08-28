# KairoPro Technical Design

**Domain:** `kairopro.in`

```text
                         KAIROPRO
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
       Next.js             Go             FastAPI
    Product UI        Platform Core       AI Engine
          │                 │                 │
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                     Infrastructure
                            │
       ┌────────────┬───────┼────────┬────────────┐
       ▼            ▼       ▼        ▼            ▼
   PostgreSQL      Redis     S3     Queue       GitHub
       │
       ▼
   Runtime / Sandbox
       │
       ▼
    Containers
       │
       ▼
  User Applications
```

---

# 1. Technology Stack

| Layer              | Technology                         |
| ------------------ | ---------------------------------- |
| Web application    | **Next.js + TypeScript**           |
| UI                 | **Tailwind CSS + shadcn/ui**       |
| Code editor        | **Monaco Editor**                  |
| Product backend    | **Go**                             |
| Go framework       | **Gin / Chi / Fiber**              |
| AI backend         | **Python + FastAPI**               |
| AI orchestration   | Python                             |
| Primary DB         | **PostgreSQL**                     |
| Vector search      | **pgvector**                       |
| Cache              | **Redis**                          |
| Message queue      | **AWS SQS**                        |
| Object storage     | **Amazon S3**                      |
| Containerization   | **Docker**                         |
| Container registry | **Amazon ECR**                     |
| Runtime            | **AWS ECS/Fargate initially**      |
| Sandbox            | Docker-based initially             |
| DNS                | **Route 53**                       |
| CDN                | **CloudFront**                     |
| Load balancing     | **ALB**                            |
| Secrets            | **AWS Secrets Manager**            |
| Logs               | **CloudWatch**                     |
| Metrics            | **OpenTelemetry**                  |
| Source control     | **GitHub API**                     |
| IaC                | **Terraform**                      |
| CI/CD              | **GitHub Actions**                 |
| Email              | SES / transactional email provider |

---

# 2. Why Three Backend Technologies?

This is important.

Don't make Go and FastAPI do the same job.

Use:

```text
Next.js
   ↓
Go
   ↓
FastAPI
```

with clear boundaries.

### Next.js

Responsible for:

* UI
* Project dashboard
* Code editor
* Terminal UI
* AI chat
* Preview
* Authentication UI
* Project management UI

### Go

Responsible for:

* API gateway
* Authentication/authorization
* Project management
* File management
* GitHub integration
* Runtime management
* Container lifecycle
* Deployment
* Job management
* WebSocket/SSE gateway
* Resource management
* Security boundaries

### FastAPI

Responsible for:

* LLM calls
* Requirement extraction
* Document understanding
* RAG
* PRD generation
* Design reasoning
* Architecture generation
* Code planning
* Code review
* AI agents
* AI debugging

This separation is extremely valuable.

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
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
        Next.js           Go API        WebSocket
        Frontend        Platform API     Gateway
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
          FastAPI AI                Runtime
             Engine                  Engine
                │                       │
        ┌───────┼───────┐        ┌──────┼──────┐
        ▼       ▼       ▼        ▼      ▼      ▼
       LLM     RAG   Agents    Docker  ECS    Build
        │       │
        ▼       ▼
    PostgreSQL  pgvector
        │
        ├───────────────┐
        ▼               ▼
      Redis             S3
```

---

# 4. Monorepo Structure

I recommend a monorepo initially.

```text
kairopro/
│
├── apps/
│   ├── web/
│   │   └── Next.js
│   │
│   ├── api/
│   │   └── Go
│   │
│   └── ai/
│       └── FastAPI
│
├── packages/
│   ├── types/
│   ├── schemas/
│   ├── prompts/
│   └── config/
│
├── runtime/
│   ├── sandbox/
│   ├── builder/
│   ├── deployer/
│   └── preview/
│
├── infrastructure/
│   ├── terraform/
│   ├── ecs/
│   ├── networking/
│   └── monitoring/
│
├── docs/
│
├── scripts/
│
├── .github/
│   └── workflows/
│
└── README.md
```

---

# 5. Next.js Architecture

```text
apps/web/

app/
├── (auth)/
│   ├── login/
│   └── signup/
│
├── dashboard/
│
├── projects/
│   └── [projectId]/
│       ├── overview/
│       ├── prd/
│       ├── design/
│       ├── architecture/
│       ├── build/
│       ├── code/
│       ├── preview/
│       ├── deployments/
│       └── settings/
│
└── api/
```

Components:

```text
components/
├── editor/
├── terminal/
├── ai-chat/
├── file-tree/
├── preview/
├── deployment/
├── project/
├── prd/
└── design/
```

---

# 6. KairoPro IDE UI

The main workspace should eventually look like:

```text
┌─────────────────────────────────────────────────────────┐
│ KairoPro          Employee App          ● Building      │
├────────────┬─────────────────────────────┬──────────────┤
│            │                             │              │
│ FILES      │ CODE                        │ PREVIEW      │
│            │                             │              │
│ src/       │ export function Login()     │              │
│ components │                             │  LIVE APP    │
│ api/       │                             │              │
│ database/  │                             │              │
│ tests/     │                             │              │
│            │                             │              │
├────────────┴─────────────────────────────┴──────────────┤
│ TERMINAL / AI ACTIVITY / LOGS                           │
├─────────────────────────────────────────────────────────┤
│ Ask KairoPro...                              [Send]      │
└─────────────────────────────────────────────────────────┘
```

This is the heart of the user experience.

---

# 7. Go Backend

Go becomes the **KairoPro control plane**.

Recommended structure:

```text
apps/api/

cmd/
└── server/
    └── main.go

internal/
├── auth/
├── users/
├── organizations/
├── projects/
├── files/
├── requirements/
├── prd/
├── designs/
├── architecture/
├── agents/
├── tasks/
├── workspaces/
├── sandbox/
├── builds/
├── deployments/
├── github/
├── notifications/
├── billing/
└── events/

pkg/
├── logger/
├── database/
├── queue/
├── storage/
└── telemetry/
```

---

# 8. Go Responsibilities

Go should handle the things that need:

### High concurrency

```text
10,000 users
        ↓
Go API
        ↓
many concurrent operations
```

### Infrastructure

Go communicates with:

* Docker
* ECS
* AWS
* GitHub
* Redis
* S3
* PostgreSQL

### Runtime

Go controls:

```text
Create sandbox
Start sandbox
Stop sandbox
Restart sandbox
Destroy sandbox
Get logs
Expose port
Deploy container
```

This is exactly the sort of work where Go shines.

---

# 9. Go API

Example API:

```text
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

---

# 10. FastAPI Architecture

FastAPI becomes the **AI engine**.

```text
apps/ai/

app/
├── main.py
│
├── api/
│   ├── requirements.py
│   ├── prd.py
│   ├── design.py
│   ├── architecture.py
│   ├── agents.py
│   └── code.py
│
├── agents/
│   ├── orchestrator.py
│   ├── requirement_agent.py
│   ├── prd_agent.py
│   ├── design_agent.py
│   ├── architecture_agent.py
│   ├── developer_agent.py
│   ├── testing_agent.py
│   └── deployment_agent.py
│
├── llm/
│   ├── provider.py
│   ├── openai.py
│   ├── anthropic.py
│   └── google.py
│
├── rag/
│   ├── embeddings.py
│   ├── retriever.py
│   └── vector_store.py
│
├── documents/
│   ├── pdf.py
│   ├── docx.py
│   ├── markdown.py
│   └── images.py
│
├── prompts/
│
└── services/
```

---

# 11. AI Orchestrator

Don't allow individual agents to control the whole system.

Create an orchestrator.

```text
                    ORCHESTRATOR
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    Requirement       Design       Architecture
       Agent           Agent           Agent
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  Developer Agent
                         │
                         ▼
                    Test Agent
                         │
                         ▼
                  Debug Agent
                         │
                         ▼
                 Deployment Agent
```

---

# 12. Agent State Machine

Don't just rely on prompts to remember where the project is.

Persist state.

```text
PROJECT_CREATED
       ↓
ANALYZING
       ↓
CLARIFICATION_REQUIRED
       ↓
PRD_GENERATED
       ↓
PRD_APPROVED
       ↓
DESIGN_GENERATED
       ↓
DESIGN_APPROVED
       ↓
ARCHITECTURE_APPROVED
       ↓
DEVELOPMENT
       ↓
TESTING
       ↓
PREVIEW
       ↓
DEPLOYMENT
       ↓
LIVE
```

---

# 13. AI Agent Contract

Every agent should have a defined input/output.

Example:

```text
Requirement Agent

INPUT:
- problem statement
- uploaded documents
- previous requirements

OUTPUT:
- requirements
- assumptions
- questions
- confidence
```

Developer Agent:

```text
INPUT:
- approved PRD
- architecture
- design
- current repository
- current task

OUTPUT:
- file changes
- commands
- explanation
- tests
```

---

# 14. AI Should Produce Structured Output

Avoid:

```text
"Here's what I think you should build..."
```

Internally use structured schemas.

Example:

```text
Requirement {
    id
    title
    description
    priority
    source
    confidence
}
```

Likewise:

```text
Task {
    id
    title
    status
    dependencies
    files
}
```

This allows the Go backend and frontend to reliably understand AI output.

---

# 15. Shared Contracts

Between:

```text
Next.js
   ↕
Go
   ↕
FastAPI
```

use explicit schemas.

For example:

```text
packages/schemas/

project.schema.json
requirement.schema.json
prd.schema.json
task.schema.json
agent-event.schema.json
deployment.schema.json
```

OpenAPI can generate clients/types where useful.

---

# 16. PostgreSQL

PostgreSQL is the central source of truth.

Major tables:

```text
users
organizations
organization_members
projects

documents
document_chunks

requirements
requirement_sources

prd_versions
design_versions
architecture_versions

tasks
task_dependencies

agent_runs
agent_messages
agent_events

workspaces
workspace_files

builds
test_runs

repositories
branches
commits

environments
deployments

domains
secrets

audit_logs
usage_records
```

---

# 17. Important Database Relationship

```text
Organization
     │
     └── Project
           │
           ├── Documents
           ├── Requirements
           ├── PRD
           ├── Design
           ├── Architecture
           ├── Tasks
           ├── Workspace
           ├── Builds
           ├── Tests
           ├── GitHub
           └── Deployments
```

---

# 18. pgvector

Use PostgreSQL + pgvector initially.

Don't introduce Pinecone/Weaviate/etc. unless you actually need them.

Pipeline:

```text
Document
 ↓
Extract
 ↓
Chunk
 ↓
Embedding
 ↓
PostgreSQL + pgvector
```

Query:

```text
User question
 ↓
Embedding
 ↓
Vector search
 ↓
Relevant document chunks
 ↓
LLM
```

---

# 19. Redis

Redis handles temporary/high-speed data.

Use cases:

```text
Caching
Rate limiting
Agent locks
Session state
Short-lived state
Pub/Sub
```

Don't use Redis as your permanent source of truth.

---

# 20. SQS

Use SQS for long-running jobs.

Example:

```text
Go API
   │
   ▼
SQS
   │
   ├── document-processing
   ├── ai-analysis
   ├── code-generation
   ├── testing
   ├── building
   └── deployment
```

---

# 21. Event-Driven Architecture

This is important for the KairoPro experience.

Instead of:

```text
AI → Go → Next.js
```

use events:

```text
Agent
 ↓
Event
 ↓
Event Bus
 ↓
Go
 ↓
WebSocket/SSE
 ↓
Next.js
```

Example events:

```text
agent.started
agent.thinking
file.created
file.updated
command.started
command.completed
test.started
test.failed
test.passed
build.started
build.completed
deployment.started
deployment.completed
```

---

# 22. Live Development Streaming

User should see:

```text
✓ Analyzed requirements
✓ Created project structure
✓ Created database schema
⟳ Creating authentication API
○ Creating frontend
○ Running tests
```

Technically:

```text
AI Worker
    │
    ▼
Event
    │
    ▼
Redis / Event Stream
    │
    ▼
Go
    │
    ▼
SSE/WebSocket
    │
    ▼
Next.js
```

---

# 23. Workspace Architecture

Every project gets a workspace.

```text
/workspaces/{project-id}/

├── frontend/
├── backend/
├── database/
├── tests/
├── package.json
└── README.md
```

But don't treat the local filesystem as the permanent source of truth.

Use:

```text
Git repository
+
Object storage
+
Runtime workspace
```

---

# 24. Sandbox

This is one of the most sensitive parts of KairoPro.

AI-generated code can execute:

```text
npm install
pip install
npm run build
pytest
git
shell
```

Therefore:

```text
                 KairoPro
                    │
                    ▼
             Sandbox Manager
                    │
                    ▼
             Isolated Runtime
                    │
             ┌──────┴──────┐
             ▼             ▼
          Project FS     Processes
```

---

# 25. Sandbox Security

Each environment needs:

* CPU limit
* Memory limit
* Disk limit
* Execution timeout
* Network restrictions
* Process restrictions
* Secret isolation
* Non-root execution
* Filesystem isolation
* Resource quotas

Never expose:

```text
AWS credentials
Database admin credentials
KairoPro secrets
Production secrets
```

to arbitrary generated code.

---

# 26. Preview Architecture

```text
Browser
   │
   ▼
preview.kairopro.in
   │
   ▼
Preview Gateway
   │
   ▼
Project Runtime
   │
   ├── Frontend :3000
   └── Backend :8000
```

Example:

```text
https://abc123.preview.kairopro.in
```

---

# 27. Production Architecture

Generated application:

```text
Source Code
    ↓
Docker Build
    ↓
ECR
    ↓
ECS/Fargate
    ↓
ALB
    ↓
Route 53
    ↓
https://myapp.kairopro.in
```

---

# 28. Deployment Engine

Go should control deployment.

```text
Go Deployment Service
        │
        ├── Build
        ├── Push image
        ├── Create/update ECS service
        ├── Configure environment
        ├── Health check
        ├── DNS
        └── Rollback
```

FastAPI should **recommend/plan** deployment changes, but Go should enforce the actual infrastructure operations.

That's an important security boundary.

---

# 29. GitHub Architecture

```text
                 KairoPro
                    │
                    ▼
              GitHub Service
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
      OAuth       Repository    Webhooks
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
     Branch       Commit         PR
```

User can:

```text
Connect GitHub
 ↓
Select Repository
 ↓
Clone
 ↓
AI modifies
 ↓
Commit
 ↓
Push
```

---

# 30. Git as the Project History

Every important development operation should map to version control.

```text
Initial project
      ↓
commit 1
      ↓
Authentication
      ↓
commit 2
      ↓
Dashboard
      ↓
commit 3
```

This gives you rollback.

---

# 31. Deployment Environments

Every project:

```text
Development
Preview
Production
```

Each environment has:

```text
Variables
Secrets
Database
Runtime
Deployment
```

---

# 32. Authentication Architecture

```text
Browser
   │
   ▼
Next.js
   │
   ▼
Go Auth
   │
   ├── Google
   ├── GitHub
   └── Email
```

Go validates sessions/tokens before allowing platform operations.

---

# 33. Authorization

Use RBAC.

```text
Owner
Admin
Developer
Designer
Viewer
```

Example:

```text
Owner
 ├── Deploy
 ├── Delete
 ├── Billing
 └── Manage members

Developer
 ├── Code
 ├── Build
 └── Preview

Viewer
 └── Read
```

---

# 34. Secrets Architecture

```text
User
 ↓
KairoPro Settings
 ↓
Secrets Manager
 ↓
Deployment
 ↓
Container Environment
```

The AI should receive only what it absolutely needs.

---

# 35. API Communication

### Browser → Go

```text
HTTPS
REST
SSE/WebSocket
```

### Go → FastAPI

Internal service-to-service HTTP/gRPC.

For MVP:

**HTTP + internal authentication** is enough.

Later, use gRPC for high-throughput internal operations where useful.

---

# 36. Why Go Should Talk to FastAPI

Don't let the browser directly call FastAPI.

Bad:

```text
Browser
 ├── Go
 └── FastAPI
```

Better:

```text
Browser
   │
   ▼
Go
   │
   ▼
FastAPI
```

Go becomes the platform's security/control boundary.

---

# 37. AI Request Flow

Example:

> "Add Google authentication."

```text
Browser
  ↓
Go API
  ↓
Create Agent Job
  ↓
SQS
  ↓
AI Worker
  ↓
FastAPI
  ↓
Requirement/Developer Agent
  ↓
Relevant repository context
  ↓
LLM
  ↓
Structured plan
  ↓
Go Runtime
  ↓
Sandbox
  ↓
Code changes
  ↓
Tests
  ↓
Events
  ↓
Browser
```

---

# 38. Document Processing Flow

```text
User
 ↓
Next.js
 ↓
Go
 ↓
S3
 ↓
SQS
 ↓
Document Worker
 ↓
FastAPI
 ↓
PDF/DOCX/OCR processing
 ↓
Normalized content
 ↓
Chunking
 ↓
Embeddings
 ↓
pgvector
 ↓
Project Knowledge
```

---

# 39. Project Creation Flow

```text
User enters:

"Build employee management system"
+
PRD.pdf
+
dashboard.png

             ↓

             Go

             ↓

          S3 upload

             ↓

      Document processing

             ↓

        FastAPI AI

             ↓

      Requirement Agent

             ↓

   Clarification questions

             ↓

          PRD

             ↓

        User approval
```

---

# 40. Development Flow

```text
Approved PRD
     ↓
Architecture
     ↓
Development Plan
     ↓
Task Graph
     ↓
Developer Agent
     ↓
Workspace
     ↓
Code
     ↓
Build
     ↓
Tests
     ↓
AI Debugging
     ↓
Preview
```

---

# 41. Autonomous Development Loop

This is the engine that makes KairoPro powerful.

```text
                TASK
                 │
                 ▼
              PLAN
                 │
                 ▼
             READ CODE
                 │
                 ▼
           MODIFY CODE
                 │
                 ▼
             RUN TEST
                 │
           ┌─────┴─────┐
           │           │
         PASS         FAIL
           │           │
           ▼           ▼
       COMPLETE     ANALYZE
                       │
                       ▼
                     FIX
                       │
                       └──────→ TEST
```

Limit iterations:

```text
MAX_REPAIR_ATTEMPTS = 5
```

to prevent infinite AI loops.

---

# 42. AI Tool System

The AI agent should not have arbitrary access to everything.

Give it tools.

```text
read_file()
write_file()
edit_file()
delete_file()

list_files()
search_code()

run_command()
run_tests()
run_build()

git_diff()
git_status()

search_project_knowledge()

request_user_approval()
```

Then permissions can be controlled.

---

# 43. AI Permission Model

Example:

```text
Developer Agent

READ_FILE       ✓
WRITE_FILE      ✓
RUN_TEST        ✓
RUN_BUILD       ✓
GIT_DIFF        ✓

DELETE_DATABASE ✗
READ_SECRET     ✗
DEPLOY_PROD     ⚠ APPROVAL
```

---

# 44. Human-in-the-Loop

The AI should pause when necessary.

Example:

```text
AI:

I need to change the database schema.

Migration:
Add users.google_id

Risk:
Existing records will be modified.

[Approve]
[Reject]
```

Production deployment:

```text
✓ Build passed
✓ Tests passed
✓ Security scan passed

Ready for production.

[Deploy]
```

---

# 45. Design System

KairoPro should maintain a project-level design system.

```text
DesignSystem
 ├── Colors
 ├── Typography
 ├── Spacing
 ├── Border Radius
 ├── Shadows
 ├── Components
 └── Breakpoints
```

The code-generation agent uses this specification.

---

# 46. PRD → Code Traceability

This is a powerful feature.

Every code task should connect back to requirements.

```text
Requirement R-023
       ↓
Task T-045
       ↓
Files
       ↓
Tests
       ↓
Deployment
```

Then users can ask:

> "Where is this requirement implemented?"

KairoPro can answer exactly.

---

# 47. Testing Architecture

```text
Generated Application
        │
        ├── Unit Tests
        ├── API Tests
        ├── Integration Tests
        └── E2E Tests
                 │
                 ▼
             Test Runner
                 │
                 ▼
              Results
                 │
         ┌───────┴───────┐
         ▼               ▼
       PASS             FAIL
                           │
                           ▼
                     AI Debugger
```

---

# 48. Browser Automation

For E2E testing, eventually use a browser automation framework such as Playwright.

Example:

```text
Open login page
 ↓
Enter email
 ↓
Enter password
 ↓
Click login
 ↓
Verify dashboard
 ↓
Create employee
 ↓
Verify employee
```

---

# 49. Build Architecture

```text
Project Workspace
       ↓
Build Worker
       ↓
Docker Build
       ↓
Security Scan
       ↓
Image
       ↓
ECR
```

---

# 50. Deployment Architecture

```text
ECR
 │
 ▼
ECS/Fargate
 │
 ▼
Target Group
 │
 ▼
ALB
 │
 ▼
Route 53
 │
 ▼
app.kairopro.in
```

---

# 51. Domain Architecture

I'd structure the domain like:

```text
kairopro.in
│
├── app.kairopro.in
│       KairoPro application
│
├── api.kairopro.in
│       API
│
├── preview.kairopro.in
│       Preview gateway
│
├── *.preview.kairopro.in
│       Project previews
│
└── *.kairopro.in
        Generated applications
```

For production custom domains later:

```text
customer.com
      ↓
KairoPro deployment
```

---

# 52. Observability

Every service should emit:

```text
Logs
Metrics
Traces
Events
```

Use OpenTelemetry as the instrumentation layer.

Example:

```text
User Request
 ↓
Next.js
 ↓
Go
 ↓
SQS
 ↓
FastAPI
 ↓
LLM
 ↓
Sandbox
 ↓
Build
```

A trace should allow you to see the entire operation.

---

# 53. Error Tracking

Every failure should have:

```text
Error ID
Project ID
Agent Run ID
Task ID
Service
Timestamp
Stack trace
Relevant logs
```

User sees:

> Deployment failed.

Developer sees:

> Deployment ID `dep_8921` failed during ECS health check.

---

# 54. Audit Logging

Record important operations:

```text
user.login
project.created
document.uploaded
prd.approved
design.approved
agent.started
file.modified
deployment.approved
deployment.completed
secret.updated
github.connected
```

This becomes extremely important once teams use KairoPro.

---

# 55. Infrastructure as Code

Do not manually create production infrastructure.

Use:

**Terraform**

Example:

```text
infrastructure/

terraform/
├── networking/
├── ecs/
├── rds/
├── redis/
├── s3/
├── ecr/
├── cloudfront/
├── route53/
├── iam/
└── monitoring/
```

Everything should be reproducible.

---

# 56. CI/CD

GitHub Actions:

```text
Push
 ↓
Lint
 ↓
Unit Tests
 ↓
Build
 ↓
Docker Build
 ↓
Security Scan
 ↓
Push ECR
 ↓
Deploy
```

Separate:

```text
development
staging
production
```

---

# 57. Environments

KairoPro itself should have:

```text
Local
Development
Staging
Production
```

And generated applications:

```text
Preview
Production
```

---

# 58. Local Development

Developers should be able to run:

```text
docker compose up
```

with:

```text
Next.js
Go
FastAPI
PostgreSQL
Redis
Local S3-compatible storage
```

For example:

```text
                    Docker Compose

 ┌─────────┐ ┌────────┐ ┌─────────┐
 │ Next.js │ │  Go    │ │ FastAPI │
 └─────────┘ └────────┘ └─────────┘
       │          │           │
       └──────────┼───────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   PostgreSQL             Redis
```

---

# 59. MVP Infrastructure

Don't build everything at once.

### Start with:

```text
Next.js
Go
FastAPI
PostgreSQL
Redis
S3
SQS
Docker
```

Then:

```text
ECR
ECS/Fargate
ALB
Route 53
CloudWatch
```

---

# 60. Scaling Architecture

Eventually:

```text
                        USERS
                          │
                          ▼
                      CloudFront
                          │
                          ▼
                         ALB
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
          Next.js         Go          WebSocket
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
          Project        Agent         Runtime
           API           Jobs          Manager
             │             │             │
             ▼             ▼             ▼
          PostgreSQL      SQS          ECS
             │             │             │
             ▼             ▼             ▼
          pgvector      Workers      Containers
```

---

# 61. Why Go + FastAPI is a Good Combination

The division becomes:

```text
                 KairoPro
                     │
        ┌────────────┴────────────┐
        │                         │
       GO                       PYTHON
        │                         │
   "Make it run"            "Make it think"
        │                         │
   Infrastructure                AI
   Networking                    LLM
   Runtime                       RAG
   Deployment                    Agents
   Concurrency                   Documents
   Security                      Code reasoning
```

That's a very clean architectural boundary.

---

# 62. Recommended Repository

I'd start with:

```text
kairopro/
│
├── apps/
│   ├── web/                # Next.js
│   ├── api/                # Go
│   └── ai/                 # FastAPI
│
├── packages/
│   ├── schemas/
│   ├── types/
│   └── prompts/
│
├── services/
│   ├── document-worker/
│   ├── agent-worker/
│   ├── build-worker/
│   └── deploy-worker/
│
├── runtime/
│   ├── sandbox/
│   ├── preview/
│   └── deployment/
│
├── infrastructure/
│   └── terraform/
│
├── docs/
│
├── scripts/
│
├── docker-compose.yml
└── README.md
```

---

# 63. Final Architecture

This is the architecture I'd use as the **north star** for KairoPro:

```text
                              KAIROPRO
                                  │
                                  ▼
                         ┌────────────────┐
                         │    Next.js     │
                         │ Product / IDE  │
                         └───────┬────────┘
                                 │
                         HTTPS / SSE / WS
                                 │
                                 ▼
                         ┌────────────────┐
                         │      GO        │
                         │ Control Plane  │
                         └───────┬────────┘
                                 │
            ┌────────────────────┼─────────────────────┐
            │                    │                     │
            ▼                    ▼                     ▼
       PostgreSQL              Redis                  S3
       + pgvector              Cache                Files
            │                    │
            │                    ▼
            │                   SQS
            │                    │
            │          ┌─────────┴──────────┐
            │          ▼                    ▼
            │      AI Workers          Runtime Workers
            │          │                    │
            │          ▼                    ▼
            │     ┌──────────┐        ┌────────────┐
            │     │ FastAPI  │        │  Sandbox   │
            │     │ AI Engine│        │  Manager   │
            │     └────┬─────┘        └─────┬──────┘
            │          │                    │
            │          ▼                    ▼
            │        LLMs                 Docker
            │                               │
            │                               ▼
            │                          Build / Test
            │                               │
            │                               ▼
            │                              ECR
            │                               │
            │                               ▼
            │                         ECS / Fargate
            │                               │
            │                  ┌────────────┼────────────┐
            │                  ▼            ▼            ▼
            │                App A        App B        App C
            │                  │            │            │
            └──────────────────┴────────────┴────────────┘
                                       │
                                       ▼
                                  LIVE PRODUCTS
```

## The three golden rules

**1. Next.js = Experience**

Everything the user sees and interacts with.

**2. Go = Control**

Everything involving users, projects, runtime, GitHub, containers, deployment, permissions and infrastructure.

**3. FastAPI = Intelligence**

Everything involving LLMs, document understanding, RAG, reasoning, agents, code planning and AI analysis.

And underneath all three:

**PostgreSQL + S3 + Redis + SQS + Docker + AWS ECS/Fargate.**

That is the stack I would lock in for **KairoPro v1**. It is sophisticated enough to support the Replit/Lovable-style vision, while still being realistic for a small engineering team to build.

# KairoPro Development Roadmap

This document outlines the complete hierarchical development roadmap for KairoPro, broken down into Phases, Modules, Tasks, and Subtasks.
As per the technical strategy, all cloud (AWS) infrastructure has been deferred to the final deployment phase. Development will rely entirely on local tooling (Docker, MinIO, Redis, MailHog) until the platform is ready for production.

---

# Detailed Monorepo Directory Structure

Below is the complete target folder and file structure for the KairoPro monorepo. This structure separates concerns between the web frontend, platform core, AI engine, and infrastructure.

```text
kairopro/
│
├── apps/
│   ├── web/                     # Next.js Frontend
│   │   ├── app/
│   │   │   ├── (auth)/          # Login/Signup routes
│   │   │   ├── dashboard/       # User project listing
│   │   │   └── projects/        # Workspace routes
│   │   │       └── [projectId]/
│   │   │           ├── overview/
│   │   │           ├── prd/
│   │   │           ├── design/
│   │   │           ├── architecture/
│   │   │           ├── build/
│   │   │           ├── code/
│   │   │           ├── preview/
│   │   │           └── deployments/
│   │   └── components/          # React components
│   │       ├── editor/
│   │       ├── terminal/
│   │       └── ai-chat/
│   │
│   ├── api/                     # Go Platform Core
│   │   ├── cmd/server/
│   │   │   └── main.go
│   │   ├── internal/            # Domain logic
│   │   │   ├── auth/
│   │   │   ├── projects/
│   │   │   ├── workspaces/
│   │   │   ├── sandbox/
│   │   │   ├── github/
│   │   │   └── events/
│   │   └── pkg/                 # Shared utilities
│   │       ├── database/
│   │       ├── storage/
│   │       └── queue/
│   │
│   └── ai/                      # FastAPI AI Engine
│       ├── app/
│       │   ├── main.py
│       │   ├── api/             # AI Endpoints
│       │   ├── agents/          # Agent Logic
│       │   │   ├── orchestrator.py
│       │   │   ├── requirement_agent.py
│       │   │   ├── prd_agent.py
│       │   │   ├── architecture_agent.py
│       │   │   └── developer_agent.py
│       │   ├── rag/             # Vector processing
│       │   ├── llm/             # Model wrappers
│       │   └── documents/       # File parsers
│       └── requirements.txt
│
├── packages/                    # Shared libraries/contracts
│   ├── schemas/                 # JSON Schemas/Contracts
│   ├── types/                   # TypeScript interfaces
│   └── prompts/                 # Core AI instructions
│
├── infrastructure/              # Cloud Provisioning (Deferred to Phase 8)
│   ├── terraform/
│   └── ecs/
│
├── scripts/                     # Local Dev & CI scripts
│
└── docker-compose.yml           # Local dev environment
```

---

# Core Development Principles

To ensure long-term maintainability and scalability, the engineering team must strictly adhere to the following principles throughout development:
1. **Full Modularity:** Services must be strictly decoupled. The Go platform core, Next.js UI, and FastAPI AI engine must remain completely independent, communicating only through defined schemas and API contracts.
2. **Separation of Concerns:** Inside each service, domain/business logic must be isolated from infrastructure and routing logic. AI Agents must have single, clearly defined responsibilities.
3. **Pluggable Architecture:** Third-party integrations (LLM providers, email, vector stores, databases) must be implemented behind interfaces/adapters so they can be swapped out in the future without rewriting core logic.

---

# Phase 1: Foundation & Local Environment

**Phase Name:** Foundation, Local Environment, & Core Services
**Objective:** Establish the foundational monorepo, local development environments via Docker, and basic CI pipelines to support future development without relying on the cloud.
**Dependencies:** None
**Phase Completion Criteria:** Local development environment successfully spins up all three services (Next.js, Go, FastAPI) with database, cache, and local object storage. CI pipelines run successfully on GitHub. 

## Modules
* **Module 1.1: Product and Technical Planning**
* **Module 1.2: Repository Setup & Local Dev**
* **Module 1.3: Local Infrastructure & CI**
* **Module 1.4: Observability & Security Base (Local)**

### Module 1.1: Product and Technical Planning
* **Module Purpose:** Finalize technical choices, database schemas, and shared contracts between services.
* **Dependencies:** None

#### Task 1.1.1: Define System Schemas and Contracts
* **Task Description:** Define JSON schemas, API contracts, and database schema diagrams.
* **Dependencies:** None
* **Expected Output:** OpenAPI specs, JSON schemas in `packages/schemas/`, DB ERD.
* **Completion Criteria:** All team members agree on API boundaries and schemas.
* **Testing/Validation Required:** Schema validation checks via a linter.
  * **Subtask 1.1.1.1:** Write initial OpenAPI specs for Go and FastAPI.
    * *What needs to be implemented:* `api-spec.yaml` files.
    * *Expected result:* Parsable API specifications.
    * *Validation:* Swagger UI renders specs correctly.
  * **Subtask 1.1.1.2:** Design core PostgreSQL schema.
    * *What needs to be implemented:* SQL migration files for core tables.
    * *Expected result:* `init.sql` or Goose/Alembic migrations.
    * *Validation:* Local database spins up with tables.

### Module 1.2: Repository Setup & Local Dev
* **Module Purpose:** Create the monorepo structure and ensure a smooth developer experience.
* **Dependencies:** Module 1.1

#### Task 1.2.1: Initialize Monorepo
* **Task Description:** Setup the KairoPro monorepo with Turborepo or similar.
* **Dependencies:** None
* **Expected Output:** Working monorepo with `apps/web`, `apps/api`, `apps/ai`.
* **Completion Criteria:** Code builds successfully across all apps.
* **Testing/Validation Required:** Monorepo build tests pass.
  * **Subtask 1.2.1.1:** Setup Next.js, Go, FastAPI scaffolds.
    * *What needs to be implemented:* Base projects in their respective directories.
    * *Expected result:* Hello-world endpoints/pages for each.
    * *Validation:* Running apps locally responds with 200 OK.
  * **Subtask 1.2.1.2:** Configure Docker Compose for local dev.
    * *What needs to be implemented:* `docker-compose.yml` including Postgres, Redis, MinIO (for local S3), and MailHog (for local email).
    * *Expected result:* `docker compose up` starts all dependencies.
    * *Validation:* All containers report healthy.

### Module 1.3: Local Infrastructure & CI
* **Module Purpose:** Set up local equivalents for cloud services and configure continuous integration.
* **Dependencies:** Module 1.2

#### Task 1.3.1: Local Service Configuration
* **Task Description:** Configure Go and FastAPI to use local services (MinIO for storage, Redis for queues).
* **Dependencies:** None
* **Expected Output:** Environment variables and SDK configs pointing to localhost/Docker containers.
* **Completion Criteria:** Apps can connect to MinIO and Redis successfully.
* **Testing/Validation Required:** Connection tests on startup.
  * **Subtask 1.3.1.1:** MinIO & Redis Integration.
    * *What needs to be implemented:* S3 SDK configured with MinIO endpoint; Redis client setup.
    * *Expected result:* Services can read/write data locally.
    * *Validation:* Successful read/write operations on startup.

#### Task 1.3.2: CI Pipeline
* **Task Description:** Setup GitHub Actions for CI (testing only, no CD).
* **Dependencies:** Task 1.3.1
* **Expected Output:** Automated workflows for linting and testing.
* **Completion Criteria:** Code merged to main must pass all tests.
* **Testing/Validation Required:** Triggering a dummy commit to verify CI.
  * **Subtask 1.3.2.1:** CI Workflow.
    * *What needs to be implemented:* YAML file for build, lint, and test.
    * *Expected result:* PRs require passing CI.
    * *Validation:* Failed tests block PR merge.

### Module 1.4: Observability & Security Base (Local)
* **Module Purpose:** Establish local logging and monitoring.
* **Dependencies:** Module 1.3

#### Task 1.4.1: Local Monitoring & Env Vars
* **Task Description:** Setup OpenTelemetry pointing to a local Jaeger/Zipkin instance and manage local `.env` files.
* **Dependencies:** None
* **Expected Output:** Centralized local traces.
* **Completion Criteria:** Services emit metrics and logs to the local collector.
* **Testing/Validation Required:** Verify traces appear in local Jaeger UI.
  * **Subtask 1.4.1.1:** Integrate OpenTelemetry.
    * *What needs to be implemented:* OTel SDK in Go and Python configured for local export.
    * *Expected result:* Traces sent to local collector.
    * *Validation:* Traces visible in Jaeger UI.

---

# Phase 2: Platform Backend & User Identity

**Phase Name:** Identity & Platform Core
**Objective:** Implement user authentication, organizations, project management, and platform billing stubs.
**Dependencies:** Phase 1
**Phase Completion Criteria:** Users can sign up, create organizations, manage projects, and trigger local test emails.

## Modules
* **Module 2.1: Authentication & User Management**
* **Module 2.2: Project & Organization Management**
* **Module 2.3: Billing Stubs & Local Notifications**

### Module 2.1: Authentication & User Management
* **Module Purpose:** Secure access to the platform via Next.js and Go API.
* **Dependencies:** Database setup

#### Task 2.1.1: Auth System
* **Task Description:** Implement JWT/OAuth authentication flow.
* **Dependencies:** None
* **Expected Output:** Working login/signup pages and protected API routes.
* **Completion Criteria:** Users can login via email/password and Google/GitHub OAuth.
* **Testing/Validation Required:** E2E auth tests.
  * **Subtask 2.1.1.1:** Next.js Auth UI.
    * *What needs to be implemented:* Login, Signup, Forgot Password screens.
    * *Expected result:* Forms that submit to Go API.
    * *Validation:* Form validation works.
  * **Subtask 2.1.1.2:** Go Auth API.
    * *What needs to be implemented:* JWT generation, OAuth handlers, Auth middleware.
    * *Expected result:* Secure endpoints returning valid JWTs.
    * *Validation:* Postman tests confirm unauthorized requests are blocked (401).

### Module 2.2: Project & Organization Management
* **Module Purpose:** Allow users to organize their work and collaborate.
* **Dependencies:** Task 2.1.1

#### Task 2.2.1: Projects & Orgs CRUD
* **Task Description:** APIs and UI for managing organizations and projects.
* **Dependencies:** Go Auth API
* **Expected Output:** Dashboard displaying projects and org settings.
* **Completion Criteria:** Users can create, update, and delete projects.
* **Testing/Validation Required:** Unit tests for Go handlers and Next.js components.
  * **Subtask 2.2.1.1:** Go APIs for Projects/Orgs.
    * *What needs to be implemented:* REST routes mapping to DB tables.
    * *Expected result:* Working CRUD endpoints.
    * *Validation:* API tests pass.
  * **Subtask 2.2.1.2:** Dashboard UI.
    * *What needs to be implemented:* Main project listing, creation modals.
    * *Expected result:* Visual dashboard.
    * *Validation:* UI successfully calls APIs and updates state.

### Module 2.3: Billing Stubs & Local Notifications
* **Module Purpose:** Set up billing models and local email testing.
* **Dependencies:** Module 2.2

#### Task 2.3.1: Local Email Integration
* **Task Description:** Integrate Go email sender with local MailHog.
* **Dependencies:** MailHog running in Docker
* **Expected Output:** Transactional emails captured by MailHog.
* **Completion Criteria:** Signup triggers an email that can be viewed in MailHog UI.
* **Testing/Validation Required:** Inspect local MailHog interface.
  * **Subtask 2.3.1.1:** Email Service in Go.
    * *What needs to be implemented:* SMTP client pointed to `localhost:1025`.
    * *Expected result:* Ability to send template emails locally.
    * *Validation:* Check MailHog UI on `localhost:8025`.

---

# Phase 3: Data Ingestion & Knowledge Base

**Phase Name:** Data Ingestion & Knowledge Base
**Objective:** Enable file uploads, extract content, and store in pgvector for RAG.
**Dependencies:** Phase 2
**Phase Completion Criteria:** Users can upload documents/images, which are successfully parsed, embedded, and stored in the project's vector knowledge base.

## Modules
* **Module 3.1: File Upload & Storage**
* **Module 3.2: Document Processing Pipeline**

### Module 3.1: File Upload & Storage
* **Module Purpose:** Securely receive and store user files locally.
* **Dependencies:** Go API

#### Task 3.1.1: Local Object Storage Flow
* **Task Description:** Implement presigned URL uploads to MinIO via Go API.
* **Dependencies:** MinIO configured
* **Expected Output:** Files uploaded to local MinIO buckets, records created in DB.
* **Completion Criteria:** Next.js UI shows uploaded files.
* **Testing/Validation Required:** Upload test files.
  * **Subtask 3.1.1.1:** Go MinIO Presigned URL Endpoint.
    * *What needs to be implemented:* API returning S3-compatible upload URL.
    * *Expected result:* Client can upload directly to MinIO.
    * *Validation:* File appears in MinIO console.

### Module 3.2: Document Processing Pipeline
* **Module Purpose:** Parse documents, generate embeddings, and populate pgvector.
* **Dependencies:** Task 3.1.1, FastAPI Setup

#### Task 3.2.1: FastAPI Document Intelligence
* **Task Description:** Parse PDF, DOCX, Markdown, and Images, then chunk and embed.
* **Dependencies:** Redis configured for queuing (e.g., RQ or Celery)
* **Expected Output:** Embeddings stored in PostgreSQL pgvector.
* **Completion Criteria:** A query to the vector DB returns relevant chunks from an uploaded file.
* **Testing/Validation Required:** Retrieval accuracy tests.
  * **Subtask 3.2.1.1:** Document Parsers.
    * *What needs to be implemented:* Python modules for each file type (PyPDF2, python-docx, OCR).
    * *Expected result:* Extracted raw text/metadata.
    * *Validation:* Verify text matches original document.
  * **Subtask 3.2.1.2:** Embedding & Vector Storage.
    * *What needs to be implemented:* LangChain/LlamaIndex integration to chunk text, call embedding API, and store in pgvector.
    * *Expected result:* Populated vector tables.
    * *Validation:* SQL query confirms vector insertion.

---

# Phase 4: AI Engine: Requirements & Planning

*(No changes to core logic; runs locally)*
**Phase Name:** AI Engine: Requirements & Planning
**Objective:** Process inputs into structured requirements, ask clarification questions, and generate a versioned PRD.
**Dependencies:** Phase 3
**Phase Completion Criteria:** KairoPro can successfully analyze a vague prompt and a PDF, ask a user questions, and produce a structured, editable PRD.

## Modules
* **Module 4.1: AI Orchestration Framework**
* **Module 4.2: Requirement Analysis & Clarification**
* **Module 4.3: PRD Generation & Editing**

### Module 4.1: AI Orchestration Framework
* **Module Purpose:** Build the FastAPI core that manages AI agents and their state.
* **Dependencies:** FastAPI setup

#### Task 4.1.1: State Machine & Agent Base
* **Task Description:** Implement orchestrator and base agent classes.
* **Dependencies:** None
* **Expected Output:** State machine controlling project lifecycle.
* **Completion Criteria:** Agents can be triggered asynchronously via local Redis queue.
* **Testing/Validation Required:** Unit tests for state transitions.
  * **Subtask 4.1.1.1:** Agent State Management.
    * *What needs to be implemented:* DB tables and Python logic for state (e.g. `ANALYZING`, `CLARIFICATION_REQUIRED`).
    * *Expected result:* State updates correctly persist.
    * *Validation:* DB queries verify state changes.

### Module 4.2: Requirement Analysis & Clarification
* **Module Purpose:** Extract requirements from knowledge base and prompt user for missing info.
* **Dependencies:** Module 4.1

#### Task 4.2.1: Requirement Agent
* **Task Description:** Agent analyzes RAG data, outputs structured requirements, generates questions.
* **Dependencies:** Knowledge Base (Phase 3)
* **Expected Output:** JSON of requirements with confidence scores and clarification questions.
* **Completion Criteria:** Low confidence triggers clarification UI on frontend.
* **Testing/Validation Required:** Agent evaluation against test dataset.
  * **Subtask 4.2.1.1:** AI Requirement Extraction.
    * *What needs to be implemented:* LLM prompt chain + RAG query to generate requirements.
    * *Expected result:* Structured requirement objects.
    * *Validation:* Assert JSON schema matches expected.
  * **Subtask 4.2.1.2:** Clarification UI & Loop.
    * *What needs to be implemented:* Next.js UI to show questions and submit answers.
    * *Expected result:* Answers fed back into Knowledge Base.
    * *Validation:* Agent proceeds to PRD generation after answers.

### Module 4.3: PRD Generation & Editing
* **Module Purpose:** Compile requirements into a comprehensive, editable PRD.
* **Dependencies:** Module 4.2

#### Task 4.3.1: PRD Agent & Editor
* **Task Description:** Generate markdown/structured PRD and provide a rich text editor.
* **Dependencies:** Locked Requirements
* **Expected Output:** PRD visible and editable in Next.js.
* **Completion Criteria:** User can accept, edit, or ask AI to modify the PRD, creating a new version.
* **Testing/Validation Required:** Version control logic tests.
  * **Subtask 4.3.1.1:** PRD Generation.
    * *What needs to be implemented:* PRD Agent generating full markdown.
    * *Expected result:* Complete PRD document.
    * *Validation:* Manual review of PRD quality.
  * **Subtask 4.3.1.2:** PRD Versioning & Editor.
    * *What needs to be implemented:* WYSIWYG editor in Next.js, versioning logic in Go API.
    * *Expected result:* Edits save as new versions.
    * *Validation:* Rollback to previous version works.

---

# Phase 5: AI Engine: Design & Architecture

*(No changes to core logic; runs locally)*
**Phase Name:** AI Engine: Design & Architecture
**Objective:** Generate design systems and technical architecture based on the approved PRD.
**Dependencies:** Phase 4
**Phase Completion Criteria:** System produces design mockups/specs and a robust architectural plan that the user can approve.

## Modules
* **Module 5.1: Design Generation**
* **Module 5.2: Architecture Generation**

### Module 5.1: Design Generation
* **Module Purpose:** Provide visual design options or interpret user-provided screenshots.
* **Dependencies:** Approved PRD

#### Task 5.1.1: Design Agent & UI Approval
* **Task Description:** AI generates design specs (Tailwind/shadcn tokens) or processes uploaded UI refs.
* **Dependencies:** None
* **Expected Output:** 3 design options presented to the user.
* **Completion Criteria:** User selects and approves a design.
* **Testing/Validation Required:** Vision model tests for uploaded screenshots.
  * **Subtask 5.1.1.1:** Generate Design Options.
    * *What needs to be implemented:* LLM prompts to define color palettes, typography, spacing.
    * *Expected result:* JSON design specifications.
    * *Validation:* UI renders preview of design tokens.

### Module 5.2: Architecture Generation
* **Module Purpose:** Define the tech stack, components, and DB schema.
* **Dependencies:** Approved PRD, Approved Design

#### Task 5.2.1: Architecture Agent
* **Task Description:** Generate frontend components list, API routes, and DB schema.
* **Dependencies:** None
* **Expected Output:** Technical architecture document.
* **Completion Criteria:** User approves the architecture, unblocking the coding phase.
* **Testing/Validation Required:** LLM produces valid, non-hallucinated architecture matching the tech stack.
  * **Subtask 5.2.1.1:** Generate Architecture Plan.
    * *What needs to be implemented:* LLM chain to map PRD to Next.js routes, Go APIs, and Postgres schemas.
    * *Expected result:* Structured architecture tree.
    * *Validation:* Manual review of technical feasibility.

---

# Phase 6: KairoPro IDE & Runtime

*(No changes to core logic; uses local Docker)*
**Phase Name:** KairoPro IDE & Runtime
**Objective:** Build the developer workspace, code editor, terminal, sandboxing, and live preview.
**Dependencies:** Phase 2
**Phase Completion Criteria:** Users have a browser-based IDE where they can see files, view terminal logs, and see a live preview of the running application.

## Modules
* **Module 6.1: Web IDE UI**
* **Module 6.2: Workspace & Sandboxing**
* **Module 6.3: Build & Preview Systems**

### Module 6.1: Web IDE UI
* **Module Purpose:** Provide a Replit-like experience for observing and interacting with code.
* **Dependencies:** Next.js setup

#### Task 6.1.1: Code Editor & Terminal
* **Task Description:** Integrate Monaco Editor and Xterm.js.
* **Dependencies:** None
* **Expected Output:** Working browser IDE layout.
* **Completion Criteria:** User can click files to view code and see real-time terminal output.
* **Testing/Validation Required:** UI responsiveness and WebSocket connection tests.
  * **Subtask 6.1.1.1:** Monaco Editor & File Tree.
    * *What needs to be implemented:* Next.js component for file navigation and Monaco editor.
    * *Expected result:* Ability to view read-only (or editable) code.
    * *Validation:* Syntax highlighting works for TS, Go, Python.
  * **Subtask 6.1.1.2:** Terminal & Live Streaming.
    * *What needs to be implemented:* Xterm.js connected via WebSocket to Go API.
    * *Expected result:* Real-time logs stream to UI.
    * *Validation:* Terminal accurately reflects backend container logs.

### Module 6.2: Workspace & Sandboxing
* **Module Purpose:** Provide secure, isolated runtime environments for generated code locally.
* **Dependencies:** Local Docker, Go API

#### Task 6.2.1: Container Management via Go
* **Task Description:** Go API manages Docker containers (create, start, stop, exec) on the host machine.
* **Dependencies:** Docker socket/API access
* **Expected Output:** Isolated sandbox for each active project.
* **Completion Criteria:** Go API successfully spins up a local container, writes files to its volume, and streams logs.
* **Testing/Validation Required:** Security isolation tests (preventing sandbox escape).
  * **Subtask 6.2.1.1:** Sandbox Controller.
    * *What needs to be implemented:* Go module interfacing with Docker SDK.
    * *Expected result:* Programmatic control of containers.
    * *Validation:* Unit tests mock Docker SDK.
  * **Subtask 6.2.1.2:** Workspace File Sync.
    * *What needs to be implemented:* Syncing DB/MinIO file state with sandbox volume.
    * *Expected result:* Code generated by AI appears in the sandbox.
    * *Validation:* Files exist inside the container.

### Module 6.3: Build & Preview Systems
* **Module Purpose:** Compile code and expose it to localhost securely.
* **Dependencies:** Module 6.2

#### Task 6.3.1: Live Preview Proxy
* **Task Description:** Route local preview paths (e.g., `localhost:8080/preview/123`) to the correct sandbox port.
* **Dependencies:** None
* **Expected Output:** Working preview URL.
* **Completion Criteria:** User clicks "Preview" and sees the running Next.js/Go app from the local sandbox.
* **Testing/Validation Required:** Routing tests and proxy load tests.
  * **Subtask 6.3.1.1:** Reverse Proxy Configuration.
    * *What needs to be implemented:* Go-based reverse proxy or dynamic Nginx config.
    * *Expected result:* Traffic correctly routes to local container IPs.
    * *Validation:* HTTP 200 from preview URL.

---

# Phase 7: AI Engine: Development & Execution

*(No changes to core logic; runs locally)*
**Phase Name:** AI Engine: Development & Execution
**Objective:** AI writes, tests, and debugs code within the sandbox environment.
**Dependencies:** Phase 5, Phase 6
**Phase Completion Criteria:** AI can generate an entire application, execute tests, capture errors, and iteratively fix them until the app runs in the sandbox.

## Modules
* **Module 7.1: AI Development Planning & Coding**
* **Module 7.2: AI Testing & Debugging Loop**

### Module 7.1: AI Development Planning & Coding
* **Module Purpose:** Break architecture into coding tasks and generate code.
* **Dependencies:** Approved Architecture, Workspace Sandbox

#### Task 7.1.1: Developer Agent
* **Task Description:** Generate code file-by-file based on architecture and PRD.
* **Dependencies:** None
* **Expected Output:** Complete source code written to the sandbox volume.
* **Completion Criteria:** AI successfully writes Next.js, Go, and SQL files.
* **Testing/Validation Required:** Code syntax validity checks.
  * **Subtask 7.1.1.1:** Task Breakdown.
    * *What needs to be implemented:* Agent splits architecture into sequential files/tasks.
    * *Expected result:* Task graph (e.g., DB -> Backend -> Frontend).
    * *Validation:* Tasks execute in correct topological order.
  * **Subtask 7.1.1.2:** Code Generation & Application.
    * *What needs to be implemented:* Agent generates code, sends via API to Go workspace manager.
    * *Expected result:* Files written to disk.
    * *Validation:* Code compiles/builds.

### Module 7.2: AI Testing & Debugging Loop
* **Module Purpose:** Ensure generated code actually works.
* **Dependencies:** Module 7.1

#### Task 7.2.1: Test & Debug Agents
* **Task Description:** AI executes build commands, reads stdout/stderr, and fixes errors.
* **Dependencies:** Terminal execution capability
* **Expected Output:** Error-free running application.
* **Completion Criteria:** Build passes, and preview server starts without crashing.
* **Testing/Validation Required:** Inject deliberate error; verify AI fixes it.
  * **Subtask 7.2.1.1:** Execution Feedback Loop.
    * *What needs to be implemented:* Agent runs `npm run dev` or `go build`, captures output.
    * *Expected result:* Agent detects errors in logs.
    * *Validation:* Error traces parsed correctly.
  * **Subtask 7.2.1.2:** Auto-Fix Logic.
    * *What needs to be implemented:* Debug agent analyzes error and modifies file.
    * *Expected result:* Subsequent build succeeds.
    * *Validation:* Loop terminates upon success.

---

# Phase 8: Cloud Infrastructure & Deployment (The Cloud Phase)

**Phase Name:** Cloud Infrastructure & Production Deployment
**Objective:** Provision AWS infrastructure, setup CI/CD pipelines for production, deploy KairoPro, and deploy user applications.
**Dependencies:** Phase 7
**Phase Completion Criteria:** AWS infrastructure is live, GitHub synchronization is complete, and users can deploy their applications to production AWS environments with custom domains.

## Modules
* **Module 8.1: AWS Infrastructure Provisioning**
* **Module 8.2: GitHub Integration**
* **Module 8.3: Production Deployment Engine**
* **Module 8.4: Domain & Secrets Management**

### Module 8.1: AWS Infrastructure Provisioning
* **Module Purpose:** Move from local Docker to real cloud services.
* **Dependencies:** AWS Account

#### Task 8.1.1: Terraform Cloud Setup
* **Task Description:** Write and apply Terraform modules for AWS VPC, ECS, RDS, Redis, S3, SQS, CloudWatch.
* **Dependencies:** None
* **Expected Output:** Applied Terraform state in a production environment.
* **Completion Criteria:** AWS resources are accessible and healthy; apps configured to use S3/SQS instead of MinIO/Redis queues.
* **Testing/Validation Required:** Infrastructure tests (e.g., Terratest).
  * **Subtask 8.1.1.1:** Provision core network and compute.
    * *What needs to be implemented:* VPC, Subnets, ECS Clusters, ALB.
    * *Expected result:* ECS cluster ready for tasks.
    * *Validation:* AWS Console shows active cluster.
  * **Subtask 8.1.1.2:** Provision data stores and services.
    * *What needs to be implemented:* RDS PostgreSQL, ElastiCache Redis, S3 buckets, SQS queues.
    * *Expected result:* Platform operates on cloud services.
    * *Validation:* Connection tests pass.

### Module 8.2: GitHub Integration
* **Module Purpose:** Synchronize KairoPro workspaces with user repositories.
* **Dependencies:** GitHub OAuth App

#### Task 8.2.1: GitHub Sync
* **Task Description:** Push generated code to a user's GitHub repo.
* **Dependencies:** Go API
* **Expected Output:** Commits visible on GitHub.
* **Completion Criteria:** User clicks "Sync to GitHub" and repo is populated.
* **Testing/Validation Required:** Test with blank GitHub repo.
  * **Subtask 8.2.1.1:** GitHub API Client.
    * *What needs to be implemented:* Go integration with GitHub APIs to create repos, branches, and commits.
    * *Expected result:* Code securely transferred.
    * *Validation:* Repo contents match workspace.

### Module 8.3: Production Deployment Engine
* **Module Purpose:** Move apps from sandbox to production AWS ECS/Fargate.
* **Dependencies:** AWS infrastructure

#### Task 8.3.1: Deployment Pipeline
* **Task Description:** Build production Docker images and deploy to user-specific ECS tasks.
* **Dependencies:** None
* **Expected Output:** Application live in production.
* **Completion Criteria:** Deployment succeeds and live URL is provided.
* **Testing/Validation Required:** Load test deployed application.
  * **Subtask 8.3.1.1:** Image Builder.
    * *What needs to be implemented:* System builds Dockerfile from workspace, pushes to ECR.
    * *Expected result:* Image tagged in ECR.
    * *Validation:* ECR contains image.
  * **Subtask 8.3.1.2:** ECS Deployer.
    * *What needs to be implemented:* Go API creates/updates ECS service and Task Definition.
    * *Expected result:* App running on Fargate.
    * *Validation:* AWS Console shows running task.

### Module 8.4: Domain & Secrets Management
* **Module Purpose:** Allow custom domains and handle user environment variables.
* **Dependencies:** Route 53, AWS Secrets Manager

#### Task 8.4.1: Custom Domains & Env Vars
* **Task Description:** Map user domains to ALB and manage secrets securely via AWS.
* **Dependencies:** None
* **Expected Output:** App accessible via user's domain.
* **Completion Criteria:** SSL cert provisioned and custom domain routes to app.
* **Testing/Validation Required:** DNS resolution tests.
  * **Subtask 8.4.1.1:** Domain Mapping.
    * *What needs to be implemented:* Route 53/ACM integration via Go.
    * *Expected result:* CNAME verification and SSL.
    * *Validation:* `https://customdomain.com` works.
  * **Subtask 8.4.1.2:** Secrets UI & Injection.
    * *What needs to be implemented:* UI to add secrets, Go API to store in AWS Secrets Manager and inject into ECS.
    * *Expected result:* Env vars available in production app.
    * *Validation:* App reads secret correctly at runtime.

---

# Phase 9: Production Readiness & Launch

**Phase Name:** Production Readiness & Launch
**Objective:** Scale, secure, and optimize KairoPro for public release.
**Dependencies:** Phases 1-8
**Phase Completion Criteria:** Platform sustains load, handles failures gracefully, and MVP is officially released to users.

## Modules
* **Module 9.1: Performance & Scaling**
* **Module 9.2: Reliability & Rollbacks**
* **Module 9.3: MVP Polish & Release**

### Module 9.1: Performance & Scaling
* **Module Purpose:** Ensure the platform handles multiple concurrent AI generation processes.
* **Dependencies:** All previous phases

#### Task 9.1.1: Load Testing & Optimization
* **Task Description:** Optimize DB queries, LLM token usage, and container startup times.
* **Dependencies:** None
* **Expected Output:** Scalable platform architecture.
* **Completion Criteria:** Platform handles 100 concurrent active users seamlessly.
* **Testing/Validation Required:** Artillery or k6 load tests.
  * **Subtask 9.1.1.1:** AI Token Caching.
    * *What needs to be implemented:* Semantic caching for LLM calls to reduce cost/latency.
    * *Expected result:* Faster generation for repeated steps.
    * *Validation:* Latency metrics drop.

### Module 9.2: Reliability & Rollbacks
* **Module Purpose:** Graceful failure handling and application versioning.
* **Dependencies:** None

#### Task 9.2.1: Automated Rollbacks
* **Task Description:** Revert deployments if health checks fail.
* **Dependencies:** ECS Deployer
* **Expected Output:** Stable production apps despite bad AI code.
* **Completion Criteria:** A failed deployment automatically reverts to the previous version.
* **Testing/Validation Required:** Deploy intentionally broken code and verify rollback.
  * **Subtask 9.2.1.1:** Health Check Monitoring.
    * *What needs to be implemented:* Deployer monitors ALB health checks post-deployment.
    * *Expected result:* Detection of failure.
    * *Validation:* Alarm triggers on failure.

### Module 9.3: MVP Polish & Release
* **Module Purpose:** Final UI/UX polish and official launch.
* **Dependencies:** None

#### Task 9.3.1: Final QA & Launch
* **Task Description:** End-to-end QA, UI animations (framer-motion), marketing site finalization.
* **Dependencies:** Feature freeze
* **Expected Output:** Polished, premium user experience.
* **Completion Criteria:** Zero P1 bugs, successful launch.
* **Testing/Validation Required:** Beta tester feedback loop.
  * **Subtask 9.3.1.1:** UI Polish.
    * *What needs to be implemented:* Ensure all micro-interactions, dark mode, and typography feel premium.
    * *Expected result:* Seamless UX.
    * *Validation:* Design QA sign-off.

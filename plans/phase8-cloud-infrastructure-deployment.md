# Phase 8: Cloud Infrastructure & Deployment — Implementation Plan

## Overview

Move from local Docker to production AWS infrastructure. Provision VPC, ECS, RDS, S3, SQS, CloudWatch via Terraform. Implement GitHub integration, production deployment pipeline, and custom domain management. After this phase, users can deploy their applications to production AWS environments.

**Key decisions:**
- IaC: Terraform for all AWS resources
- Container runtime: ECS Fargate (serverless containers)
- Database: RDS PostgreSQL with pgvector
- Storage: S3 (replacing MinIO)
- Queue: SQS (replacing Redis queues)
- Cache: ElastiCache Redis
- Secrets: AWS Secrets Manager
- DNS: Route 53 + ACM for SSL
- CI/CD: GitHub Actions → ECR → ECS

---

## Module 8.1: AWS Infrastructure Provisioning

### 8.1.1 — Terraform Modules

**Files to create:**
- `infrastructure/terraform/main.tf` — root module
- `infrastructure/terraform/variables.tf` — all variables
- `infrastructure/terraform/outputs.tf` — all outputs
- `infrastructure/terraform/providers.tf` — AWS provider config
- `infrastructure/terraform/backend.tf` — S3 state backend
- `infrastructure/terraform/versions.tf` — Terraform + provider version constraints

**Network module:**
- `infrastructure/terraform/modules/vpc/main.tf`
- `infrastructure/terraform/modules/vpc/variables.tf`
- `infrastructure/terraform/modules/vpc/outputs.tf`

**Resources:**
- VPC with CIDR 10.0.0.0/16
- 3 public subnets (for ALB, NAT Gateway)
- 3 private subnets (for ECS tasks, RDS)
- 3 isolated subnets (for RDS, no internet)
- Internet Gateway
- NAT Gateway (one per AZ for HA)
- Route tables (public, private, isolated)
- VPC endpoints (SSM, SQS, S3, ECR)

**Compute module:**
- `infrastructure/terraform/modules/ecs/main.tf`
- `infrastructure/terraform/modules/ecs/variables.tf`
- `infrastructure/terraform/modules/ecs/outputs.tf`

**Resources:**
- ECS Cluster (`kairopro-platform`)
- ECS Task Definitions:
  - `web` (Next.js, 0.5 vCPU, 1GB RAM)
  - `api` (Go, 0.5 vCPU, 1GB RAM)
  - `ai` (FastAPI, 1 vCPU, 2GB RAM)
  - `ai-worker` (Python RQ worker, 0.5 vCPU, 1GB RAM)
- ECS Services (one per task definition)
- Auto Scaling policies (CPU > 70% → scale up)
- Application Load Balancer
  - HTTP → HTTPS redirect
  - Path-based routing:
    - `/` → web service
    - `/api/*` → api service
    - `/ai/*` → ai service
  - Health checks on `/health` for each service
- Target Groups for each service
- Security Groups (ALB → ECS, ECS → RDS/Redis/S3/SQS)

**Data stores module:**
- `infrastructure/terraform/modules/datastores/main.tf`
- `infrastructure/terraform/modules/datastores/variables.tf`
- `infrastructure/terraform/modules/datastores/outputs.tf`

**Resources:**
- RDS PostgreSQL 16 instance (db.r6g.large, Multi-AZ)
  - pgvector extension enabled
  - Parameter group with pgvector settings
  - Subnet group in isolated subnets
  - Security group allowing ECS access on port 5432
- ElastiCache Redis 7 cluster (cache.r6g.large)
  - Replication group for HA
  - Subnet group in private subnets
  - Security group allowing ECS access on port 6379
- S3 buckets:
  - `kairopro-uploads-{env}` — user file uploads
  - `kairopro-artifacts-{env}` — build artifacts
  - `kairopro-terraform-state-{env}` — Terraform state
  - Server-side encryption (AES256)
  - Versioning enabled
  - CORS configuration for web uploads
  - Lifecycle rules (archive to Glacier after 90 days)
- SQS Queues:
  - `kairopro-document-processing-{env}` — document processing jobs
  - `kairopro-agent-tasks-{env}` — AI agent task queue
  - Dead-letter queues for each
  - Visibility timeout: 5 minutes
  - Message retention: 7 days

**Security module:**
- `infrastructure/terraform/modules/security/main.tf`
- `infrastructure/terraform/modules/security/variables.tf`
- `infrastructure/terraform/modules/security/outputs.tf`

**Resources:**
- IAM Roles:
  - `kairopro-web-task-role` — S3 read, SQS send, Secrets read
  - `kairopro-api-task-role` — S3 read/write, SQS send/receive, Secrets read, RDS connect, ECS exec
  - `kairopro-ai-task-role` — S3 read/write, SQS send/receive, Secrets read, RDS connect
  - `kairopro-deploy-role` — ECR push, ECS update, Secrets write
- IAM Policies for each role (least privilege)
- AWS Secrets Manager secrets:
  - `kairopro/database-url`
  - `kairopro/redis-url`
  - `kairopro/jwt-secret`
  - `kairopro/openai-api-key`
  - `kairopro/oauth-google-client-id`
  - `kairopro/oauth-google-client-secret`
  - `kairopro/oauth-github-client-id`
  - `kairopro/oauth-github-client-secret`
- KMS key for encryption at rest

**Monitoring module:**
- `infrastructure/terraform/modules/monitoring/main.tf`
- `infrastructure/terraform/modules/monitoring/variables.tf`
- `infrastructure/terraform/modules/monitoring/outputs.tf`

**Resources:**
- CloudWatch Log Groups:
  - `/kairopro/web`
  - `/kairopro/api`
  - `/kairopro/ai`
  - `/kairopro/ai-worker`
  - Log retention: 30 days
- CloudWatch Dashboards:
  - `kairopro-overview` — service health, CPU, memory, request count
  - `kairopro-ai` — agent runs, LLM token usage, queue depth
- CloudWatch Alarms:
  - High CPU (>80% for 5 min)
  - High memory (>85% for 5 min)
  - 5xx error rate (>1% for 5 min)
  - Queue depth (>100 for 10 min)
  - RDS connection count (>80% max)
- SNS Topics for alarm notifications

### 8.1.2 — ECS Task Definitions

**Files to create:**
- `infrastructure/ecs/web-task-definition.json` — Next.js task definition
- `infrastructure/ecs/api-task-definition.json` — Go API task definition
- `infrastructure/ecs/ai-task-definition.json` — FastAPI task definition
- `infrastructure/ecs/ai-worker-task-definition.json` — AI worker task definition

**Each task definition includes:**
- Container image (ECR URI)
- CPU and memory limits
- Environment variables from Secrets Manager
- Log configuration (CloudWatch)
- Health check command
- Port mappings
- Essential container flag

### 8.1.3 — Dockerfiles for Production

**Files to create:**
- `apps/web/Dockerfile` — multi-stage Next.js build
- `apps/api/Dockerfile` — multi-stage Go build
- `apps/ai/Dockerfile` — multi-stage Python build

**Next.js Dockerfile pattern:**
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**Go Dockerfile pattern:**
```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /server /server
EXPOSE 8080
CMD ["/server"]
```

**Python Dockerfile pattern:**
```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

FROM python:3.12-slim
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /app /app
WORKDIR /app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Module 8.2: GitHub Integration

### 8.2.1 — Database: Repositories Table

**Files to create:**
- `apps/api/migrations/00034_create_repositories.sql`

**Schema:**
```sql
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'github', -- 'github'
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL, -- "owner/name"
  repository_url TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  webhook_id TEXT,
  webhook_secret TEXT,
  access_token_encrypted TEXT, -- encrypted GitHub token
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, provider, full_name)
);

CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_kairopro_branch BOOLEAN NOT NULL DEFAULT FALSE,
  last_commit_sha TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  sha TEXT NOT NULL,
  message TEXT,
  author TEXT,
  authored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_repositories_project ON repositories(project_id);
CREATE INDEX idx_branches_repository ON branches(repository_id);
CREATE INDEX idx_commits_branch ON commits(branch_id);
```

### 8.2.2 — Go GitHub Client

**Files to create:**
- `apps/api/internal/github/handler.go` — replace stub with full implementation
- `apps/api/internal/github/service.go` — GitHub business logic
- `apps/api/internal/github/client.go` — GitHub API client wrapper
- `apps/api/internal/github/webhook.go` — webhook handler
- `apps/api/pkg/encryption/aes.go` — AES encryption for tokens

**GitHub endpoints:**
```
GET    /api/v1/auth/oauth/github              — initiate GitHub OAuth
GET    /api/v1/auth/oauth/github/callback      — GitHub OAuth callback
POST   /api/v1/projects/:id/github/connect    — connect GitHub repo
DELETE /api/v1/projects/:id/github/disconnect   — disconnect GitHub repo
GET    /api/v1/projects/:id/github/status      — get GitHub sync status
POST   /api/v1/projects/:id/github/sync       — push code to GitHub
POST   /api/v1/projects/:id/github/branch     — create branch
GET    /api/v1/projects/:id/github/branches   — list branches
POST   /api/v1/github/webhook                  — receive GitHub webhooks
```

**GitHub sync flow:**
1. User connects GitHub account via OAuth
2. User selects or creates repository for project
3. KairoPro creates branch `kairopro/{feature-name}` for each agent run
4. AI commits changes to branch
5. User can create PR from branch or push to main
6. Webhook receives push events → KairoPro detects external changes

**GitHub client operations:**
- Create repository
- Create branch
- Create commit (multiple files)
- Create pull request
- List branches
- Get repository content
- Set up webhooks

---

## Module 8.3: Production Deployment Engine

### 8.3.1 — Database: Environments & Deployments

**Files to create:**
- `apps/api/migrations/00035_create_environments_deployments.sql`

**Schema:**
```sql
CREATE TABLE environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'development', 'preview', 'production'
  slug TEXT NOT NULL, -- 'dev', 'preview', 'prod'
  status TEXT NOT NULL DEFAULT 'inactive', -- active, inactive, deploying
  config JSONB DEFAULT '{}', -- environment-specific config
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, slug)
);

CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  version TEXT NOT NULL, -- semantic version or commit SHA
  status TEXT NOT NULL DEFAULT 'pending', -- pending, building, deploying, live, failed, rolled_back
  image_tag TEXT, -- ECR image tag
  build_log TEXT,
  deploy_log TEXT,
  deployed_by UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_environments_project ON environments(project_id);
CREATE INDEX idx_deployments_project ON deployments(project_id);
CREATE INDEX idx_deployments_environment ON deployments(environment_id);
CREATE INDEX idx_deployments_status ON deployments(status);
```

### 8.3.2 — Deployment Pipeline

**Files to create:**
- `apps/api/internal/deployments/handler.go` — deployment endpoints
- `apps/api/internal/deployments/service.go` — deployment orchestration
- `apps/api/internal/deployments/builder.go` — Docker image builder
- `apps/api/internal/deployments/deployer.go` — ECS deployer
- `apps/api/pkg/aws/ecr.go` — ECR client
- `apps/api/pkg/aws/ecs.go` — ECS client
- `apps/api/pkg/aws/secrets.go` — Secrets Manager client
- `apps/api/pkg/aws/route53.go` — Route 53 client
- `apps/api/pkg/aws/acm.go` — ACM certificate client

**Deployment flow:**
1. User clicks "Deploy" (or AI triggers after tests pass)
2. Go creates deployment record with status `pending`
3. Go builds Docker image in workspace container
4. Go pushes image to ECR
5. Go updates ECS task definition with new image tag
6. Go updates ECS service (rolling deployment)
7. Go monitors health check on ALB target
8. If health check passes → status `live`
9. If health check fails → rollback to previous version, status `failed`

**Deployment endpoints:**
```
POST   /api/v1/projects/:id/deployments          — trigger deployment
GET    /api/v1/projects/:id/deployments          — list deployments
GET    /api/v1/projects/:id/deployments/:id      — get deployment details
POST   /api/v1/projects/:id/deployments/:id/rollback — rollback deployment
GET    /api/v1/projects/:id/deployments/:id/logs  — stream deployment logs
```

**Auto-rollback:**
- After deployment, monitor ALB health checks for 5 minutes
- If 5xx rate > 5% or health check fails → automatic rollback
- Rollback: update ECS service to previous task definition
- Notify user via email (SES) and in-app notification

### 8.3.3 — Deployment Dashboard UI

**Files to create:**
- `apps/web/app/projects/[projectId]/deployments/page.tsx` — deployment dashboard
- `apps/web/components/deployments/deploy-button.tsx` — deploy trigger
- `apps/web/components/deployments/deployment-list.tsx` — deployment history
- `apps/web/components/deployments/deployment-status.tsx` — live status indicator
- `apps/web/components/deployments/deployment-logs.tsx` — streaming logs
- `apps/web/components/deployments/environment-selector.tsx` — dev/preview/prod
- `apps/web/lib/deployments.ts` — deployment API client

**Deployment dashboard features:**
- Environment tabs: Development | Preview | Production
- Deploy button with confirmation dialog
- Live deployment status (building → deploying → live)
- Streaming build/deploy logs
- Deployment history with version, status, deployer, timestamp
- Rollback button for each deployment
- Live URL for deployed application

---

## Module 8.4: Domain & Secrets Management

### 8.4.1 — Database: Domains & Secrets

**Files to create:**
- `apps/api/migrations/00036_create_domains_secrets.sql`

**Schema:**
```sql
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  domain TEXT NOT NULL, -- e.g., "app.example.com"
  verification_method TEXT NOT NULL DEFAULT 'dns', -- 'dns', 'txt'
  verification_token TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ssl_status TEXT NOT NULL DEFAULT 'pending', -- pending, provisioning, active, failed
  ssl_arn TEXT, -- ACM certificate ARN
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, domain)
);

CREATE TABLE project_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL, -- AES-256 encrypted
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, environment_id, key)
);
```

### 8.4.2 — Domain Management

**Files to create:**
- `apps/api/internal/deployments/domain_handler.go` — domain endpoints
- `apps/api/internal/deployments/domain_service.go` — domain business logic

**Domain endpoints:**
```
POST   /api/v1/projects/:id/domains            — add custom domain
GET    /api/v1/projects/:id/domains            — list domains
DELETE /api/v1/projects/:id/domains/:domainId  — remove domain
POST   /api/v1/projects/:id/domains/:domainId/verify — verify domain ownership
GET    /api/v1/projects/:id/domains/:domainId/status — get SSL status
```

**Domain setup flow:**
1. User adds domain (e.g., `app.example.com`)
2. Go creates verification token and DNS instructions
3. User adds CNAME record pointing to ALB
4. User adds TXT record for verification
5. Go verifies DNS records
6. Go requests ACM certificate via DNS validation
7. Once certificate is active, Go configures ALB listener for domain
8. Domain is live with HTTPS

### 8.4.3 — Secrets Management

**Files to create:**
- `apps/api/internal/deployments/secrets_handler.go` — secrets endpoints
- `apps/api/internal/deployments/secrets_service.go` — secrets business logic
- `apps/api/pkg/encryption/aes.go` — update with per-project encryption

**Secrets endpoints:**
```
POST   /api/v1/projects/:id/secrets            — create/update secret
GET    /api/v1/projects/:id/secrets            — list secret keys (never values)
DELETE /api/v1/projects/:id/secrets/:key       — delete secret
```

**Secret management:**
- Secrets encrypted with AES-256 using a per-project key
- Master key stored in AWS Secrets Manager
- Secrets never appear in: browser, logs, AI responses, git commits
- On deployment, secrets injected as environment variables into ECS task
- UI shows only key names, never values

### 8.4.4 — Secrets UI

**Files to create:**
- `apps/web/components/deployments/secrets-manager.tsx` — secrets management UI
- `apps/web/components/deployments/domain-setup.tsx` — domain setup wizard

**Secrets UI features:**
- Add/edit/delete secrets per environment
- Masked values (show/hide toggle)
- Never expose values in page source
- Environment selector (dev/preview/prod)

**Domain setup wizard:**
- Step 1: Enter domain name
- Step 2: Show DNS instructions (CNAME + TXT records)
- Step 3: Verify DNS (with retry)
- Step 4: Wait for SSL certificate provisioning
- Step 5: Domain live

---

## Production Service Updates

**Files to modify:**
- `apps/api/pkg/database/postgres.go` — add RDS connection support
- `apps/api/pkg/storage/minio.go` — add S3 support (dual mode: MinIO local, S3 production)
- `apps/api/pkg/queue/redis.go` — add SQS support (dual mode: Redis local, SQS production)
- `apps/api/pkg/email/smtp.go` — add SES support (dual mode: MailHog local, SES production)
- `apps/ai/app/rag/vector_store.py` — add RDS pgvector support
- `apps/ai/app/worker.py` — add SQS worker mode

**Environment-based service switching:**
```go
// Storage: MinIO (local) vs S3 (production)
if os.Getenv("APP_ENV") == "production" {
    storage = NewS3Client(cfg)
} else {
    storage = NewMinIOClient(cfg)
}

// Queue: Redis (local) vs SQS (production)
if os.Getenv("APP_ENV") == "production" {
    queue = NewSQSClient(cfg)
} else {
    queue = NewRedisClient(cfg)
}
```

---

## CI/CD Pipeline Updates

**Files to create/modify:**
- `.github/workflows/ci.yml` — update with build + push to ECR
- `.github/workflows/deploy-staging.yml` — deploy to staging on merge to develop
- `.github/workflows/deploy-production.yml` — deploy to production on merge to main

**CI/CD flow:**
```
Push to PR → CI (lint, test, build)
Push to develop → CI + Deploy to Staging
Push to main → CI + Deploy to Production
Tag release → Deploy to Production (manual trigger)
```

---

## Verification Steps

1. **Terraform apply:** `terraform apply` creates all AWS resources without errors
2. **ECS services:** All 4 services (web, api, ai, ai-worker) start and pass health checks
3. **RDS connectivity:** Go API connects to RDS PostgreSQL with pgvector
4. **S3 uploads:** File uploads work through S3 (not MinIO)
5. **SQS queues:** Document processing jobs flow through SQS
6. **GitHub OAuth:** User can connect GitHub account and repository
7. **GitHub sync:** Code changes push to GitHub branch
8. **Deployment pipeline:** Build → ECR push → ECS update → health check → live
9. **Custom domain:** Domain verification, SSL provisioning, and HTTPS access work
10. **Secrets management:** Secrets stored encrypted, injected into ECS tasks
11. **Auto-rollback:** Failed deployment automatically rolls back to previous version
12. **Monitoring:** CloudWatch dashboards show service health, alarms trigger notifications

---

## Implementation Order

1. Terraform modules (VPC, ECS, data stores, security, monitoring)
2. ECS task definitions
3. Production Dockerfiles (multi-stage builds)
4. Go AWS SDK clients (ECR, ECS, Secrets Manager, Route 53, ACM)
5. Go GitHub integration (OAuth, API client, webhooks)
6. Go deployment pipeline (build, push, deploy, rollback)
7. Go domain management (DNS verification, SSL provisioning)
8. Go secrets management (AES encryption, environment injection)
9. Production service switching (MinIO→S3, Redis→SQS, MailHog→SES)
10. Next.js deployment dashboard UI
11. Next.js domain setup wizard
12. Next.js secrets manager UI
13. CI/CD pipeline updates
14. End-to-end verification
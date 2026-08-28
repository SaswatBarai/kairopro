# Phase 8: Cloud Infrastructure & Deployment — Implementation Plan

## Overview

Move from local Docker to production AWS infrastructure. Provision VPC, ECS, RDS, S3, SQS via Terraform. Implement GitHub integration via **Next.js API routes** (AWS SDK), production deployment pipeline, and custom domain management. No Go service — all platform operations run inside Next.js API routes.

**Key decisions:**
- IaC: Terraform for all AWS resources
- Container runtime: ECS Fargate
- Database: RDS PostgreSQL with pgvector
- Storage: S3 (replacing MinIO)
- Queue: SQS (replacing BullMQ local Redis)
- Cache: ElastiCache Redis
- Secrets: AWS Secrets Manager
- DNS: Route 53 + ACM
- GitHub integration: Next.js API routes using `@octokit/rest`
- Deployment pipeline: Next.js API routes using AWS SDK (ECR + ECS)

---

## Module 8.1: AWS Infrastructure Provisioning

### 8.1.1 — Terraform Modules

**Files to create:**
- `infrastructure/terraform/main.tf`
- `infrastructure/terraform/variables.tf`
- `infrastructure/terraform/outputs.tf`
- `infrastructure/terraform/providers.tf`
- `infrastructure/terraform/backend.tf` — S3 state backend
- `infrastructure/terraform/versions.tf`

**Network module (`modules/vpc/`):**
- VPC (10.0.0.0/16), 3 public subnets, 3 private subnets, 3 isolated subnets
- Internet Gateway, NAT Gateway, Route tables
- VPC endpoints (SSM, SQS, S3, ECR)

**Compute module (`modules/ecs/`):**

ECS Cluster: `kairopro-platform`

ECS Task Definitions:
- `web` — Next.js (1 vCPU, 2GB RAM; all platform logic here)
- `ai` — FastAPI (1 vCPU, 2GB RAM)
- `ai-worker` — FastAPI BullMQ consumer (0.5 vCPU, 1GB RAM)

ALB path routing:
- `/*` → Next.js `web` service (handles all `/api/*` and UI)
- `/ai/*` → FastAPI `ai` service (internal only, blocked by security group from public)

**Data stores module (`modules/datastores/`):**
- RDS PostgreSQL 16 (db.r6g.large, Multi-AZ, pgvector extension)
- ElastiCache Redis 7 (cache.r6g.large, replication group)
- S3 buckets: `kairopro-uploads-{env}`, `kairopro-artifacts-{env}`, `kairopro-terraform-state-{env}`
- SQS queues: `kairopro-document-processing-{env}`, `kairopro-ai-tasks-{env}` (+ DLQs)

**Security module (`modules/security/`):**

IAM Roles:
- `kairopro-web-task-role` — S3, SQS, Secrets Manager, ECR, ECS exec, Route 53, ACM, RDS
- `kairopro-ai-task-role` — S3, SQS, Secrets Manager, RDS connect
- `kairopro-deploy-role` — ECR push, ECS update, Secrets write

AWS Secrets Manager secrets:
- `kairopro/database-url`
- `kairopro/redis-url`
- `kairopro/nextauth-secret`
- `kairopro/ai-service-token`
- `kairopro/openai-api-key`
- `kairopro/oauth-google-{client-id,client-secret}`
- `kairopro/oauth-github-{client-id,client-secret}`

**Monitoring module (`modules/monitoring/`):**
- CloudWatch Log Groups: `/kairopro/web`, `/kairopro/ai`, `/kairopro/ai-worker`
- CloudWatch Dashboards + Alarms (CPU >80%, 5xx rate >1%, queue depth >100)
- SNS alarm notifications

### 8.1.2 — ECS Task Definitions

**Files to create:**
- `infrastructure/ecs/web-task-definition.json` — Next.js
- `infrastructure/ecs/ai-task-definition.json` — FastAPI
- `infrastructure/ecs/ai-worker-task-definition.json` — FastAPI BullMQ worker

Each task: container image (ECR URI), CPU/memory, Secrets Manager env vars, CloudWatch logs, health check.

### 8.1.3 — Production Dockerfiles

**`apps/web/Dockerfile`** — multi-stage Next.js build:
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

**`apps/ai/Dockerfile`** — multi-stage Python:
```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

FROM python:3.12-slim AS runner
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /app /app
WORKDIR /app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 8.1.4 — Production Service Switching (Next.js)

**`apps/web/lib/storage.ts`** — dual mode:
```typescript
import { S3Client } from '@aws-sdk/client-s3'

export const storage = new S3Client(
  process.env.NODE_ENV === 'production'
    ? { region: process.env.AWS_REGION! }                          // S3 via IAM role
    : {
        endpoint: process.env.MINIO_ENDPOINT,
        credentials: { accessKeyId: process.env.MINIO_ACCESS_KEY!, secretAccessKey: process.env.MINIO_SECRET_KEY! },
        region: 'us-east-1',
        forcePathStyle: true,
      }
)
```

**`apps/web/lib/redis.ts`** — dual mode:
```typescript
// Local: Redis + BullMQ
// Production: SQS via @aws-sdk/client-sqs (or keep Redis via ElastiCache)
// ElastiCache Redis is compatible with ioredis — no code change needed in production
export const redis = new Redis(process.env.REDIS_URL!)
```

**`apps/web/lib/email.ts`** — dual mode:
```typescript
// Local: MailHog via nodemailer
// Production: Resend or SES
export async function sendEmail(to: string, subject: string, html: string) {
  if (process.env.NODE_ENV === 'production') {
    // Use Resend SDK
    await resend.emails.send({ from: 'KairoPro <noreply@kairopro.in>', to, subject, html })
  } else {
    await nodemailerTransporter.sendMail({ from: '...', to, subject, html })
  }
}
```

---

## Module 8.2: GitHub Integration

### 8.2.1 — Prisma Schema: Repositories

```prisma
model Repository {
  id                    String   @id @default(cuid())
  projectId             String   @unique
  provider              String   @default("github")
  owner                 String
  name                  String
  fullName              String
  repositoryUrl         String
  defaultBranch         String   @default("main")
  webhookId             String?
  webhookSecret         String?
  encryptedAccessToken  String?
  project               Project  @relation(fields: [projectId], references: [id])
  branches              Branch[]
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model Branch {
  id                  String     @id @default(cuid())
  repositoryId        String
  name                String
  isKairoProBranch    Boolean    @default(false)
  lastCommitSha       String?
  repository          Repository @relation(fields: [repositoryId], references: [id])
  createdAt           DateTime   @default(now())
}
```

### 8.2.2 — Next.js GitHub API Routes

**`apps/web/lib/github.ts`** — Octokit wrapper:
```typescript
import { Octokit } from '@octokit/rest'

export function getOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken })
}

export async function createRepo(token: string, name: string, isPrivate = true) {
  const octokit = getOctokit(token)
  return octokit.repos.createForAuthenticatedUser({ name, private: isPrivate })
}

export async function commitFiles(token: string, owner: string, repo: string, branch: string, files: FileChange[]) {
  // Create tree, create commit, update ref
}
```

**Files to create:**
- `apps/web/app/api/projects/[id]/github/connect/route.ts` — connect GitHub repo
- `apps/web/app/api/projects/[id]/github/sync/route.ts` — push code to GitHub
- `apps/web/app/api/projects/[id]/github/branches/route.ts` — list + create branches
- `apps/web/app/api/github/webhook/route.ts` — receive GitHub webhooks

**GitHub endpoints:**
```
POST   /api/projects/:id/github/connect     — connect/create GitHub repo
DELETE /api/projects/:id/github/disconnect  — disconnect repo
GET    /api/projects/:id/github/status      — get sync status
POST   /api/projects/:id/github/sync        — push code to GitHub
POST   /api/projects/:id/github/branch      — create branch
GET    /api/projects/:id/github/branches    — list branches
POST   /api/github/webhook                  — GitHub webhook handler
```

---

## Module 8.3: Production Deployment Engine

### 8.3.1 — Prisma Schema: Environments & Deployments

```prisma
model Environment {
  id          String       @id @default(cuid())
  projectId   String
  name        String       // development, preview, production
  slug        String       // dev, preview, prod
  status      String       @default("inactive")
  config      Json         @default("{}")
  project     Project      @relation(fields: [projectId], references: [id])
  deployments Deployment[]
  secrets     ProjectSecret[]
  createdAt   DateTime     @default(now())

  @@unique([projectId, slug])
}

model Deployment {
  id            String      @id @default(cuid())
  projectId     String
  environmentId String
  version       String
  status        String      @default("pending") // pending, building, deploying, live, failed, rolled_back
  imageTag      String?
  buildLog      String?
  deployLog     String?
  deployedById  String?
  startedAt     DateTime?
  completedAt   DateTime?
  environment   Environment @relation(fields: [environmentId], references: [id])
  project       Project     @relation(fields: [projectId], references: [id])
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
```

### 8.3.2 — Next.js Deployment Pipeline

**`apps/web/lib/aws.ts`** — AWS SDK wrappers:
```typescript
import { ECRClient, GetAuthorizationTokenCommand } from '@aws-sdk/client-ecr'
import { ECSClient, UpdateServiceCommand, RegisterTaskDefinitionCommand } from '@aws-sdk/client-ecs'

export const ecr = new ECRClient({ region: process.env.AWS_REGION! })
export const ecs = new ECSClient({ region: process.env.AWS_REGION! })

export async function pushToECR(projectId: string, imageTag: string) { /* ... */ }
export async function updateECSService(cluster: string, service: string, taskDef: string) { /* ... */ }
export async function waitForECSStable(cluster: string, service: string): Promise<boolean> { /* ... */ }
```

**Files to create:**
- `apps/web/app/api/projects/[id]/deployments/route.ts` — list + trigger deployment
- `apps/web/app/api/projects/[id]/deployments/[dId]/route.ts` — get deployment
- `apps/web/app/api/projects/[id]/deployments/[dId]/rollback/route.ts` — rollback
- `apps/web/app/api/projects/[id]/deployments/[dId]/logs/route.ts` — stream logs

**Deployment flow:**
1. `POST /api/projects/:id/deployments` → create Deployment record (pending)
2. BullMQ `deployment` job enqueued
3. Worker: `docker build` in sandbox → `docker push` to ECR via Next.js AWS SDK
4. Worker: register new ECS task definition → update ECS service
5. Worker: poll ALB health checks → if passes → status = `live`
6. If health check fails → rollback to previous task definition → status = `rolled_back`
7. Emit SSE event → browser notified

**Auto-rollback logic (in BullMQ worker):**
```typescript
import { deploymentQueue } from '@/lib/redis'
import { ecsClient, waitForECSStable } from '@/lib/aws'

deploymentQueue.process(async (job) => {
  const { deploymentId, projectId } = job.data

  await db.deployment.update({ where: { id: deploymentId }, data: { status: 'building' } })

  // Build image in sandbox
  const { stdout } = await execInSandbox(containerId, ['docker', 'build', '-t', imageTag, '.'])
  await db.deployment.update({ where: { id: deploymentId }, data: { buildLog: stdout } })

  // Push to ECR
  await pushToECR(projectId, imageTag)
  await db.deployment.update({ where: { id: deploymentId }, data: { status: 'deploying' } })

  // Update ECS
  const taskDef = await registerTaskDef(imageTag)
  await updateECSService(cluster, service, taskDef)

  // Wait for stable
  const healthy = await waitForECSStable(cluster, service)
  if (!healthy) {
    await rollbackECS(cluster, service)
    await db.deployment.update({ where: { id: deploymentId }, data: { status: 'rolled_back' } })
  } else {
    await db.deployment.update({ where: { id: deploymentId }, data: { status: 'live', completedAt: new Date() } })
  }

  // Notify via Redis → SSE
  await redis.publish(`project-events:${projectId}`, JSON.stringify({ type: 'deployment.complete' }))
})
```

### 8.3.3 — Deployment Dashboard UI

**Files to create:**
- `apps/web/app/projects/[projectId]/deployments/page.tsx`
- `apps/web/components/deployments/deploy-button.tsx`
- `apps/web/components/deployments/deployment-list.tsx`
- `apps/web/components/deployments/deployment-status.tsx`
- `apps/web/components/deployments/deployment-logs.tsx` — streaming SSE logs
- `apps/web/components/deployments/environment-selector.tsx`
- `apps/web/lib/deployments.ts`

---

## Module 8.4: Domain & Secrets Management

### 8.4.1 — Prisma Schema: Domains & Secrets

```prisma
model Domain {
  id                String   @id @default(cuid())
  projectId         String
  domain            String
  verificationToken String
  isVerified        Boolean  @default(false)
  sslStatus         String   @default("pending") // pending, provisioning, active, failed
  sslArn            String?
  project           Project  @relation(fields: [projectId], references: [id])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([projectId, domain])
}

model ProjectSecret {
  id            String      @id @default(cuid())
  projectId     String
  environmentId String
  key           String
  encryptedValue String
  createdById   String?
  project       Project     @relation(fields: [projectId], references: [id])
  environment   Environment @relation(fields: [environmentId], references: [id])
  createdAt     DateTime    @default(now())

  @@unique([projectId, environmentId, key])
}
```

### 8.4.2 — Next.js Domain & Secrets API Routes

**`apps/web/lib/aws-dns.ts`** — Route 53 + ACM wrappers
**`apps/web/lib/encryption.ts`** — AES-256 encryption for secrets

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

export function encrypt(plaintext: string, key: string): string { /* AES-256-GCM */ }
export function decrypt(ciphertext: string, key: string): string { /* ... */ }
```

**Files to create:**
- `apps/web/app/api/projects/[id]/domains/route.ts` — add/list domains
- `apps/web/app/api/projects/[id]/domains/[dId]/verify/route.ts` — verify DNS
- `apps/web/app/api/projects/[id]/secrets/route.ts` — CRUD secrets (values never returned)

**`apps/web/components/deployments/domain-setup.tsx`** — 5-step DNS wizard
**`apps/web/components/deployments/secrets-manager.tsx`** — masked values UI

---

## CI/CD Pipeline Updates

**Files to create:**
- `.github/workflows/ci.yml` — updated: lint + test + docker build
- `.github/workflows/deploy-staging.yml` — deploy on push to `develop`
- `.github/workflows/deploy-production.yml` — deploy on push to `main`

```yaml
# deploy-production.yml
name: Deploy Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker build -t $ECR_REGISTRY/kairopro-web:$GITHUB_SHA apps/web
          docker push $ECR_REGISTRY/kairopro-web:$GITHUB_SHA
      - name: Trigger deployment via Next.js API
        run: |
          curl -X POST https://kairopro.in/api/deployments/trigger \
            -H "Authorization: Bearer $DEPLOY_TOKEN" \
            -d '{"imageTag": "${{ github.sha }}", "environment": "production"}'
```

---

## Verification Steps

1. `terraform apply` → all AWS resources created without errors
2. ECS services (web, ai, ai-worker) pass health checks in AWS console
3. Next.js API connects to RDS PostgreSQL with pgvector
4. File uploads work through S3 (not MinIO)
5. GitHub OAuth → user connects GitHub account
6. GitHub sync → code pushed to GitHub branch
7. Deployment pipeline: trigger → ECR push → ECS update → health check → live
8. Auto-rollback: deploy broken image → ECS health check fails → rollback
9. Custom domain: DNS verification → ACM cert → HTTPS works
10. Secrets: encrypted in DB, injected into ECS tasks, never exposed in browser/logs

---

## Implementation Order

1. Terraform modules (VPC, ECS, datastores, security, monitoring)
2. ECS task definitions (web, ai, ai-worker)
3. Production Dockerfiles (Next.js, FastAPI)
4. `apps/web/lib/aws.ts` — ECR, ECS, Secrets Manager SDK wrappers
5. `apps/web/lib/github.ts` — Octokit wrappers
6. GitHub API routes (connect, sync, branches, webhook)
7. Deployment BullMQ worker (build → ECR → ECS → health check → rollback)
8. Deployment API routes (trigger, list, get, rollback, logs)
9. Domain management routes + Route 53/ACM wrappers
10. Secrets management routes + AES encryption
11. Production service switching (S3, ElastiCache Redis, Resend/SES)
12. Next.js deployment dashboard UI
13. Domain setup wizard UI
14. Secrets manager UI
15. CI/CD pipeline updates
16. End-to-end verification
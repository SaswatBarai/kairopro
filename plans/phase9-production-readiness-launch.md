# Phase 9: Production Readiness & Launch — Implementation Plan

## Overview

Scale, secure, and optimize KairoPro for public release. Performance tuning, reliability (circuit breakers, rollbacks, graceful degradation), UI polish, and launch. All optimization work is in **Next.js** and **FastAPI** — no Go service.

**Key decisions:**
- LLM caching: Redis-based semantic cache in FastAPI
- Performance: Prisma connection pooling, query optimization, container pre-warming
- Reliability: Circuit breakers in Next.js lib, graceful FastAPI degradation
- UX: Framer Motion animations, dark mode (`next-themes`), premium typography
- Monitoring: CloudWatch dashboards + OpenTelemetry

---

## Module 9.1: Performance & Scaling

### 9.1.1 — LLM Token Caching

**Files to create:**
- `apps/ai/app/llm/cache.py` — semantic cache for LLM calls
- `apps/ai/app/llm/cache_config.py`

**Semantic cache:**
```python
class SemanticCache:
    """Cache LLM responses using vector similarity of prompts."""

    async def get(self, prompt: str, agent_type: str, threshold: float = 0.95) -> str | None:
        # 1. Embed the prompt
        # 2. pgvector cosine search for similar cached prompts
        # SELECT response_text FROM llm_cache
        #   WHERE agent_type = %s AND 1 - (prompt_embedding <=> %s::vector) > %s
        #   AND (expires_at IS NULL OR expires_at > NOW())
        # 3. Return cached response or None
        pass

    async def set(self, prompt: str, response: str, agent_type: str, ttl_hours: int = 1) -> None:
        # Store prompt embedding + response in pgvector
        pass
```

**Cache table** (raw SQL, run after `prisma migrate`):
```sql
CREATE TABLE IF NOT EXISTS llm_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_embedding vector(1536) NOT NULL,
  prompt_text   TEXT NOT NULL,
  response_text TEXT NOT NULL,
  model         TEXT NOT NULL,
  agent_type    TEXT NOT NULL,
  token_count   INTEGER,
  hit_count     INTEGER DEFAULT 0,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_llm_cache_embedding
  ON llm_cache USING ivfflat (prompt_embedding vector_cosine_ops) WITH (lists = 100);
```

**Cache TTL by agent:**
| Agent | TTL |
|-------|-----|
| Requirement analysis | 24h |
| PRD generation | 1h |
| Design generation | 30m |
| Architecture generation | 30m |
| Code generation | No cache |
| Debug | No cache |

### 9.1.2 — Prisma Query Optimization

**File:** `apps/web/lib/db.ts` — add logging and query inspection

```typescript
export const db = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'warn', 'error']
    : ['warn', 'error'],
})
```

**Performance migrations** (raw SQL):
```sql
-- Project listing
CREATE INDEX IF NOT EXISTS idx_projects_org_state ON "Project"("organizationId", "state");
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON "Project"("createdById");

-- Agent runs
CREATE INDEX IF NOT EXISTS idx_agent_runs_project_status ON "AgentRun"("projectId", "status");

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_project_status ON "Document"("projectId", "processingStatus");

-- Deployments
CREATE INDEX IF NOT EXISTS idx_deployments_env_status ON "Deployment"("environmentId", "status");
CREATE INDEX IF NOT EXISTS idx_deployments_created ON "Deployment"("createdAt" DESC);
```

Run as `prisma db execute --file migrations/performance_indexes.sql`.

**Prisma Accelerate** (production): Enable in `DATABASE_URL` for connection pooling at the edge.

**N+1 query elimination:** Use Prisma `include` for project listing:
```typescript
const projects = await db.project.findMany({
  where: { organizationId },
  include: {
    _count: { select: { documents: true, agentRuns: true } },
    deployments: { where: { status: 'live' }, take: 1, orderBy: { createdAt: 'desc' } },
  },
  orderBy: { updatedAt: 'desc' },
})
```

### 9.1.3 — Container Pre-Warming Pool

**File:** `apps/web/lib/sandbox-pool.ts`

```typescript
import { db } from './db'
import { createSandbox } from './docker'
import { redis } from './redis'

const POOL_SIZE = 2
const POOL_KEY = 'sandbox:warm-pool'

export async function getWarmContainer(): Promise<string> {
  const containerId = await redis.lpop(POOL_KEY)
  if (containerId) {
    // Background: replenish pool
    void replenishPool()
    return containerId
  }
  // No warm containers available — create one now (slower)
  return createSandbox('warm-' + Date.now())
}

async function replenishPool() {
  const poolSize = await redis.llen(POOL_KEY)
  for (let i = poolSize; i < POOL_SIZE; i++) {
    const id = await createSandbox('warm-' + Date.now())
    await redis.rpush(POOL_KEY, id)
  }
}
```

### 9.1.4 — API Response Caching

**File:** `apps/web/lib/cache.ts`

```typescript
import { redis } from './redis'

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)
  const result = await fn()
  await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds)
  return result
}
```

Use in API routes for stable reads (PRD, design, architecture):
```typescript
const prd = await withCache(`prd:${projectId}`, 300, () =>
  db.pRDVersion.findFirst({ where: { projectId }, orderBy: { version: 'desc' } })
)
```

---

## Module 9.2: Reliability & Rollbacks

### 9.2.1 — Automated Deployment Rollback

**File:** `apps/web/lib/workers/deployment-worker.ts` (update)

```typescript
async function monitorDeployment(deploymentId: string, cluster: string, service: string) {
  const MONITOR_DURATION = 5 * 60 * 1000  // 5 minutes
  const CHECK_INTERVAL = 30 * 1000
  const start = Date.now()

  while (Date.now() - start < MONITOR_DURATION) {
    await new Promise(r => setTimeout(r, CHECK_INTERVAL))
    const healthy = await checkECSHealth(cluster, service)
    if (!healthy) {
      // Rollback
      const previous = await getPreviousTaskDef(cluster, service)
      await updateECSService(cluster, service, previous)
      await db.deployment.update({ where: { id: deploymentId }, data: { status: 'rolled_back' } })
      await sendEmail(userEmail, 'Deployment Auto-Rolled Back', rollbackEmailTemplate)
      return
    }
  }
  // All clear
  await db.deployment.update({ where: { id: deploymentId }, data: { status: 'live' } })
}
```

**Rollback triggers:**
- ECS health check fails for 2+ consecutive checks
- 5xx error rate >5% for 3 consecutive minutes
- Manual rollback via `POST /api/projects/:id/deployments/:dId/rollback`

### 9.2.2 — Circuit Breakers (Next.js)

**File:** `apps/web/lib/circuit-breaker.ts`

```typescript
interface CircuitBreakerState {
  failures: number
  lastFailure: number
  state: 'closed' | 'open' | 'half-open'
}

const breakers = new Map<string, CircuitBreakerState>()

export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  fallback: () => T
): Promise<T> {
  const breaker = breakers.get(name) ?? { failures: 0, lastFailure: 0, state: 'closed' }

  if (breaker.state === 'open') {
    if (Date.now() - breaker.lastFailure > 30_000) {
      breaker.state = 'half-open'
    } else {
      return fallback()
    }
  }

  try {
    const result = await fn()
    breaker.failures = 0
    breaker.state = 'closed'
    return result
  } catch (err) {
    breaker.failures++
    breaker.lastFailure = Date.now()
    if (breaker.failures >= 5) breaker.state = 'open'
    breakers.set(name, breaker)
    return fallback()
  }
}
```

Usage:
```typescript
// In Next.js API route:
const aiResult = await withCircuitBreaker(
  'fastapi-analyze',
  () => callAI('/ai/analyze', body),
  () => ({ error: 'AI temporarily unavailable. Please try again in a moment.' })
)
```

Circuit breakers for:
- FastAPI AI calls → graceful "AI unavailable" message
- S3 operations → queue for retry
- GitHub API → queue and retry

### 9.2.3 — Rate Limiting (Next.js)

**File:** `apps/web/lib/rate-limiter.ts`

```typescript
import { redis } from './redis'

export async function rateLimit(userId: string, endpoint: string, limit: number, windowSecs: number): Promise<boolean> {
  const key = `rate:${userId}:${endpoint}:${Math.floor(Date.now() / (windowSecs * 1000))}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSecs)
  return count <= limit
}
```

Limits:
- General API: 100 req/min per user
- AI analysis: 10 req/min per user
- File uploads: 20 req/min per user

Apply in Next.js middleware or individual API routes.

### 9.2.4 — Graceful Degradation (FastAPI)

**File:** `apps/ai/app/middleware/circuit_breaker.py`

```python
class CircuitBreaker:
    def __init__(self, max_failures: int = 5, reset_timeout: int = 30):
        self.max_failures = max_failures
        self.reset_timeout = reset_timeout
        self.failures = 0
        self.last_failure_time = None
        self.state = "closed"

    async def call(self, fn, fallback=None):
        if self.state == "open":
            if time.time() - self.last_failure_time > self.reset_timeout:
                self.state = "half-open"
            elif fallback:
                return fallback()
            else:
                raise HTTPException(503, "Service temporarily unavailable")
        try:
            result = await fn()
            self.failures = 0
            self.state = "closed"
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure_time = time.time()
            if self.failures >= self.max_failures:
                self.state = "open"
            raise

llm_breaker = CircuitBreaker()
```

### 9.2.5 — Structured Error Handling

**`apps/web/lib/errors.ts`:**
```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public retryable: boolean = false,
  ) { super(message) }
}

export function handleApiError(err: unknown): Response {
  if (err instanceof AppError) {
    return Response.json({ code: err.code, message: err.message, retryable: err.retryable }, { status: err.statusCode })
  }
  console.error(err)
  return Response.json({ code: 'INTERNAL_ERROR', message: 'Something went wrong' }, { status: 500 })
}
```

**React error boundary:**
- `apps/web/components/errors/error-boundary.tsx`
- `apps/web/components/errors/error-page.tsx` — friendly 400/401/403/404/429/500/503 pages

---

## Module 9.3: MVP Polish & Release

### 9.3.1 — UI Polish

**Libraries:**
- `framer-motion` — page transitions, micro-animations
- `next-themes` — dark mode with system preference
- `@fontsource/inter` or `next/font/google` for Inter

**`apps/web/lib/animations.ts`:**
```typescript
import { Variants } from 'framer-motion'

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -20 },
}

export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.05 } }
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}

export const cardHover = {
  whileHover: { y: -2, transition: { duration: 0.15 } }
}
```

**Dark mode (`apps/web/app/layout.tsx`):**
```tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Typography:** Inter for UI, JetBrains Mono for code/terminal, loaded via `next/font/google`.

**Responsive breakpoints:**
- Mobile: 320–768px (stacked layout)
- Tablet: 768–1024px (sidebar collapses)
- Desktop: 1024px+ (full layout)
- IDE: minimum 1280px

### 9.3.2 — Loading States & Skeletons

**Files to create:**
- `apps/web/components/ui/skeleton.tsx` — shimmer skeletons
- `apps/web/components/ui/spinner.tsx`
- `apps/web/components/ui/progress.tsx`
- `apps/web/components/ai/agent-progress.tsx` — step-by-step agent progress

### 9.3.3 — Notification System

**Prisma schema:**
```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  projectId String?
  type      String   // deployment.complete, deployment.failed, agent.complete, build.failed, etc.
  title     String
  message   String
  data      Json     @default("{}")
  read      Boolean  @default(false)
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())

  @@index([userId, createdAt(sort: Desc)])
}
```

**API routes:**
- `apps/web/app/api/notifications/route.ts` — `GET` list, `PATCH` read-all
- `apps/web/app/api/notifications/[id]/route.ts` — `PATCH` mark read, `DELETE`

**UI:**
- `apps/web/components/ui/notification-bell.tsx` — header bell with badge
- `apps/web/components/ui/toast.tsx` — ephemeral toast notifications

### 9.3.4 — Final QA Checklist

**File:** `docs/qa-checklist.md`

**Authentication:**
- [ ] Email signup → welcome email in inbox
- [ ] Email login with correct/wrong password
- [ ] Google OAuth full flow
- [ ] GitHub OAuth full flow
- [ ] Protected routes redirect unauthenticated users
- [ ] Session persists on page refresh

**Project Flow:**
- [ ] Create project from dashboard
- [ ] Upload PDF, DOCX, MD, PNG — all parse correctly
- [ ] AI extracts requirements with confidence scores
- [ ] Clarification questions appear for low-confidence items
- [ ] User answers → requirements update
- [ ] PRD generates from locked requirements
- [ ] PRD editor: edit, AI-modify, view versions
- [ ] Design generates 3 options with live CSS preview
- [ ] Design approval → state transitions
- [ ] Architecture generates and displays
- [ ] Architecture Q&A works
- [ ] Architecture approval → development unlocked

**Development:**
- [ ] Sandbox container starts
- [ ] File tree renders
- [ ] Monaco editor opens/edits files
- [ ] Xterm.js terminal connects
- [ ] AI generates code task-by-task
- [ ] Build triggers and streams logs
- [ ] Tests run; debug loop fixes failures
- [ ] Live preview shows running app

**Deployment:**
- [ ] Deploy to staging (ECR → ECS)
- [ ] Deploy to production
- [ ] Custom domain DNS setup
- [ ] SSL cert provisions
- [ ] Secrets injected into ECS
- [ ] Manual rollback works
- [ ] Auto-rollback on failed health check

**Performance:**
- [ ] Dashboard load <2s
- [ ] Project creation <1s
- [ ] AI analysis starts <3s
- [ ] File upload <5s (10MB)
- [ ] Sandbox starts <10s (pre-warmed)
- [ ] 100 concurrent users — no degradation (k6 load test)

**Security:**
- [ ] JWT/session expires correctly
- [ ] Rate limiting returns 429
- [ ] Secrets never appear in browser/logs/git
- [ ] Container isolated from host
- [ ] XSS/CSRF protection active

### 9.3.5 — Landing Page

**Files to create:**
- `apps/web/app/page.tsx` — full landing page
- `apps/web/app/pricing/page.tsx`
- `apps/web/components/landing/{hero,features,how-it-works,pricing-cards,cta,footer}.tsx`

**Sections:**
1. Hero: "Describe it. Build it. Ship it." + CTA
2. How it works: Idea → Requirements → PRD → Design → Architecture → Code → Deploy
3. Features: AI-powered, full-stack, live preview, one-click deploy
4. Pricing: Free / Pro / Team / Enterprise
5. CTA: "Get started for free"

---

## Verification Steps

1. LLM caching: Same prompt within TTL → `hit_count` increments, response cached
2. Query perf: Project listing <100ms, PRD loading <200ms
3. Container startup: Pre-warmed → assigned in <2s; cold start <15s
4. Auto-rollback: Deploy broken image → ECS unhealthy → rollback → previous live
5. Circuit breaker: Kill FastAPI → Next.js API returns graceful error (not 500)
6. Rate limiting: 101st request in a minute → 429
7. Dark mode: Toggle → all components render correctly
8. Animations: Page transitions smooth, no layout shifts
9. Notifications: Deployment complete → in-app bell badge + email
10. Load test (k6): 100 VUs, 5-minute ramp → P95 response <500ms
11. Full E2E (Playwright): Create project → analyze → clarify → PRD → design → architecture → develop → test → deploy → live

---

## Implementation Order

1. LLM semantic cache (FastAPI + pgvector table)
2. Prisma query optimization + performance indexes
3. Container pre-warming pool (`sandbox-pool.ts`)
4. API response caching (`withCache` utility)
5. Automated rollback in deployment worker
6. Circuit breaker (`lib/circuit-breaker.ts`)
7. Rate limiter (`lib/rate-limiter.ts`)
8. FastAPI circuit breaker + graceful degradation
9. Structured error handling (Next.js + React error boundary)
10. Framer Motion animations + dark mode
11. Loading skeletons + spinners
12. Notification system (Prisma + API routes + UI)
13. Landing page + pricing page
14. QA checklist execution
15. k6 load test + optimization
16. Final E2E Playwright test suite
17. Public launch
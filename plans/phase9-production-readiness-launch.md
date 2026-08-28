# Phase 9: Production Readiness & Launch — Implementation Plan

## Overview

Scale, secure, and optimize KairoPro for public release. Implement performance optimizations (LLM token caching, query optimization, container startup), reliability features (automated rollbacks, health checks, graceful degradation), and final polish (UI animations, dark mode, error UX). After this phase, KairoPro is ready for public MVP launch.

**Key decisions:**
- LLM caching: Redis-based semantic cache for repeated prompts
- Performance: Connection pooling, query optimization, container pre-warming
- Reliability: Circuit breakers, rate limiting, graceful degradation
- UX: Framer Motion animations, dark mode, premium typography
- Monitoring: CloudWatch dashboards + alerts + custom metrics

---

## Module 9.1: Performance & Scaling

### 9.1.1 — LLM Token Caching

**Files to create:**
- `apps/ai/app/llm/cache.py` — semantic cache for LLM calls
- `apps/ai/app/llm/cache_config.py` — cache configuration

**Semantic cache strategy:**
```python
class SemanticCache:
    """Cache LLM responses using semantic similarity of prompts."""
    
    async def get(self, prompt: str, threshold: float = 0.95) -> str | None:
        """Check if a semantically similar prompt has been cached."""
        # 1. Embed the prompt
        # 2. Search pgvector for similar prompts (cosine similarity > threshold)
        # 3. If found, return cached response
        pass
    
    async def set(self, prompt: str, response: str, metadata: dict = None):
        """Cache an LLM response."""
        # 1. Embed the prompt
        # 2. Store prompt embedding + response in pgvector
        pass
```

**Cache database:**
```sql
CREATE TABLE llm_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_embedding vector(1536) NOT NULL,
  prompt_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  model TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_llm_cache_embedding ON llm_cache USING ivfflat (prompt_embedding vector_cosine_ops) WITH (lists = 100);
```

Migration: `apps/api/migrations/00037_create_llm_cache.sql`

**Cache policies:**
- Requirement analysis: cache for 24 hours (same project, similar prompts)
- PRD generation: cache for 1 hour (same requirements)
- Design generation: cache for 30 minutes (same PRD)
- Architecture generation: cache for 30 minutes (same design)
- Code generation: no cache (always fresh)
- Cache hit tracking: increment `hit_count` on each cache hit
- Cache eviction: delete entries older than `expires_at`

### 9.1.2 — Database Query Optimization

**Files to create/modify:**
- `apps/api/pkg/database/postgres.go` — update with connection pooling and query optimization
- `apps/api/pkg/database/migrations.go` — add indexes for common queries

**Optimizations:**
- Connection pooling: pgxpool with max 25 connections, min 5
- Prepared statements for frequently executed queries
- Composite indexes on (project_id, status) for all entity tables
- Partial indexes on (status) WHERE status = 'active'
- Query explain analysis on slow endpoints
- N+1 query elimination in project listing (batch load members, documents, latest deployment)

**New indexes:**
```sql
-- Projects listing optimization
CREATE INDEX idx_projects_org_status ON projects(organization_id, status);
CREATE INDEX idx_projects_created_by ON projects(created_by);

-- Agent runs optimization
CREATE INDEX idx_agent_runs_project_status ON agent_runs(project_id, status);

-- Documents optimization
CREATE INDEX idx_documents_project_status ON documents(project_id, processing_status);

-- Deployments optimization
CREATE INDEX idx_deployments_env_status ON deployments(environment_id, status);
CREATE INDEX idx_deployments_created ON deployments(created_at DESC);
```

Migration: `apps/api/migrations/00038_add_performance_indexes.sql`

### 9.1.3 — Container Startup Optimization

**Files to create:**
- `infrastructure/ecs/warm-pool.tf` — ECS warm pool configuration
- `apps/api/internal/sandbox/pool.go` — container pre-warming pool

**Container pool strategy:**
- Pre-warm 2 sandbox containers at all times
- When user opens project, assign pre-warmed container (instant startup)
- When pool drops below 2, create new containers in background
- Idle containers recycled after 30 minutes
- Container images cached on ECS instances

**ECS auto-scaling:**
- Min capacity: 2 (always warm)
- Max capacity: 20
- Scale-up: CPU > 70% or memory > 80%
- Scale-down: CPU < 30% and memory < 40% for 15 minutes
- Target tracking: 60% CPU utilization

### 9.1.4 — API Response Caching

**Files to create:**
- `apps/api/pkg/middleware/cache.go` — HTTP response caching middleware

**Caching strategy:**
- Redis cache for GET responses (project list, PRD, design, architecture)
- Cache keys: `cache:{user_id}:{endpoint}:{params}`
- TTL: 30 seconds for project list, 5 minutes for PRD/design/architecture
- Cache invalidation on POST/PATCH/DELETE
- ETag support for conditional requests

---

## Module 9.2: Reliability & Rollbacks

### 9.2.1 — Automated Rollbacks

**Files to create:**
- `apps/api/internal/deployments/health_monitor.go` — deployment health monitoring
- `apps/api/internal/deployments/rollback.go` — automated rollback logic

**Health monitoring:**
```go
type HealthMonitor struct {
    interval    time.Duration // check every 30 seconds
    duration    time.Duration // monitor for 5 minutes post-deploy
    threshold   float64      // 5% error rate threshold
    ecsClient   *ecs.Client
    albClient   *elbv2.Client
}

func (m *HealthMonitor) Monitor(ctx context.Context, deploymentID string) error {
    // 1. Start monitoring after deployment completes
    // 2. Check ALB target health every 30 seconds
    // 3. Check 5xx error rate from CloudWatch metrics
    // 4. If health check fails or error rate > threshold:
    //    a. Create rollback deployment
    //    b. Update ECS service to previous task definition
    //    c. Notify user via email + in-app
    //    d. Log rollback event
    // 5. If healthy for full duration, mark deployment as stable
}
```

**Rollback triggers:**
- ALB target health check fails for > 2 consecutive checks
- 5xx error rate > 5% for 3 consecutive minutes
- ECS task crashes > 3 times in 5 minutes
- Manual rollback via API or UI

### 9.2.2 — Circuit Breakers

**Files to create:**
- `apps/api/pkg/middleware/circuit_breaker.go` — circuit breaker middleware
- `apps/api/pkg/middleware/rate_limiter.go` — rate limiting middleware
- `apps/ai/app/middleware/circuit_breaker.py` — FastAPI circuit breaker

**Circuit breaker pattern:**
```go
type CircuitBreaker struct {
    maxFailures    int           // 5 failures before opening
    resetTimeout   time.Duration // 30 seconds before half-open
    halfOpenMax    int           // 1 request allowed in half-open
    state          string        // "closed", "open", "half-open"
    failureCount   int
    lastFailure    time.Time
}
```

**Circuit breakers for:**
- FastAPI AI calls (if AI engine is down, return graceful error)
- S3 operations (if S3 is down, queue uploads for retry)
- SQS operations (if SQS is down, fall back to Redis queue)
- GitHub API calls (if rate limited, queue and retry)

**Rate limiting:**
- Per-user: 100 requests/minute for API, 10 AI requests/minute
- Per-project: 5 concurrent agent runs
- Global: 1000 requests/minute across all users
- Redis-based sliding window rate limiter

### 9.2.3 — Graceful Degradation

**Files to create:**
- `apps/api/pkg/middleware/fallback.go` — fallback responses for degraded services

**Degradation strategies:**
- AI engine down: Return cached responses, show "AI temporarily unavailable" message
- S3 down: Queue uploads in Redis, process when S3 recovers
- SQS down: Use Redis queue as fallback
- GitHub down: Queue sync operations, process when GitHub recovers
- RDS down: Return cached data where possible, show error for writes

### 9.2.4 — Error Handling & Recovery

**Files to create:**
- `apps/api/pkg/errors/errors.go` — structured error types
- `apps/api/pkg/errors/handler.go` — error handler middleware
- `apps/web/components/errors/error-boundary.tsx` — React error boundary
- `apps/web/components/errors/error-page.tsx` — friendly error pages

**Structured error format:**
```go
type AppError struct {
    ID          string            `json:"id"`           // unique error ID for tracking
    Code        string            `json:"code"`         // e.g., "PROJECT_NOT_FOUND"
    Message     string            `json:"message"`      // human-readable message
    Details     map[string]any    `json:"details"`      // additional context
    StatusCode  int               `json:"-"`            // HTTP status code
    Retryable   bool              `json:"retryable"`    // can the client retry?
    Documentation string          `json:"docs_url,omitempty"` // link to docs
}
```

**Error pages:**
- 400: Bad Request — "Something went wrong with your request"
- 401: Unauthorized — "Please sign in to continue"
- 403: Forbidden — "You don't have permission to access this"
- 404: Not Found — "This page doesn't exist"
- 429: Rate Limited — "Slow down, you're making too many requests"
- 500: Server Error — "Something went wrong on our end" (with error ID for support)
- 503: Service Unavailable — "We're experiencing issues, please try again"

---

## Module 9.3: MVP Polish & Release

### 9.3.1 — UI Polish

**Files to create/modify:**
- `apps/web/components/ui/` — update all shadcn/ui components with animations
- `apps/web/lib/animations.ts` — Framer Motion animation variants
- `apps/web/app/layout.tsx` — update with dark mode provider
- `apps/web/app/globals.css` — update with dark mode styles

**Animation library: Framer Motion**

**Animation variants:**
```typescript
// Page transitions
export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.2 }
};

// Staggered list items
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } }
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 }
};

// Card hover
export const cardHover = {
  whileHover: { y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }
};

// Skeleton loading
export const shimmer = {
  animate: { backgroundPosition: ["200% 0", "-200% 0"] },
  transition: { duration: 2, repeat: Infinity }
};
```

**Dark mode:**
- Use `next-themes` for theme management
- All components support `dark:` Tailwind variants
- Design tokens include dark mode palette (from Phase 5)
- System preference detection + manual toggle
- Persisted in localStorage

**Typography:**
- Primary: Inter (headings + body)
- Code: JetBrains Mono (terminal, code editor)
- Font loading: `next/font` with `display: swap`
- Responsive type scale: mobile-first

**Responsive design:**
- Mobile: 320px - 768px (stack layout)
- Tablet: 768px - 1024px (sidebar collapses)
- Desktop: 1024px+ (full layout)
- IDE view: minimum 1280px (file tree + editor + preview)

### 9.3.2 — Loading States & Skeletons

**Files to create:**
- `apps/web/components/ui/skeleton.tsx` — skeleton loading components
- `apps/web/components/ui/spinner.tsx` — loading spinners
- `apps/web/components/ui/progress.tsx` — progress bars
- `apps/web/components/ai/agent-progress.tsx` — agent activity progress

**Skeleton components:**
- `SkeletonCard` — for project cards
- `SkeletonTable` — for data tables
- `SkeletonEditor` — for code editor
- `SkeletonDashboard` — for dashboard page

**Loading patterns:**
- Initial page load: full-page skeleton
- Data fetching: inline skeleton
- AI processing: animated progress with step indicators
- File upload: progress bar with percentage
- Build/deploy: streaming log output with spinner

### 9.3.3 — Notification System

**Files to create:**
- `apps/web/components/ui/toast.tsx` — toast notifications
- `apps/web/components/ui/notification-bell.tsx` — notification dropdown
- `apps/web/lib/notifications.ts` — notification client
- `apps/api/internal/notifications/handler.go` — notification endpoints
- `apps/api/internal/notifications/service.go` — notification business logic
- `apps/api/pkg/email/templates/deployment-complete.html` — deployment email
- `apps/api/pkg/email/templates/deployment-failed.html` — failure email
- `apps/api/pkg/email/templates/agent-complete.html` — agent completion email

**Database:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'deployment.complete', 'deployment.failed', 'agent.complete', 'agent.failed', 'clarification.required', 'build.complete', 'build.failed'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE NOT read;
```

Migration: `apps/api/migrations/00039_create_notifications.sql`

**Notification endpoints:**
```
GET    /api/v1/notifications          — list notifications (paginated)
PATCH  /api/v1/notifications/:id/read — mark as read
PATCH  /api/v1/notifications/read-all — mark all as read
DELETE /api/v1/notifications/:id      — delete notification
```

**Notification triggers:**
- Deployment complete → email + in-app
- Deployment failed → email + in-app
- Agent run complete → in-app
- Agent run failed → in-app
- Clarification required → in-app
- Build complete → in-app
- Build failed → in-app

### 9.3.4 — Final QA Checklist

**Files to create:**
- `docs/qa-checklist.md` — comprehensive QA checklist

**QA categories:**

**Authentication:**
- [ ] Email/password signup works
- [ ] Email/password login works
- [ ] Google OAuth works
- [ ] GitHub OAuth works
- [ ] Token refresh works
- [ ] Logout clears session
- [ ] Protected routes redirect to login

**Project Flow:**
- [ ] Create project from dashboard
- [ ] Enter problem statement
- [ ] Upload files (PDF, DOCX, MD, PNG)
- [ ] AI analyzes requirements
- [ ] Clarification questions appear
- [ ] User answers questions
- [ ] Requirements lock at ≥94% confidence
- [ ] PRD generates successfully
- [ ] PRD editor works (edit, AI modify, version history)
- [ ] Design generates 3 options
- [ ] Design preview renders correctly
- [ ] Design approval works
- [ ] Architecture generates correctly
- [ ] Architecture review works
- [ ] Architecture approval works

**Development:**
- [ ] Workspace container starts
- [ ] File tree loads
- [ ] Code editor works (syntax highlighting, tabs)
- [ ] Terminal connects via WebSocket
- [ ] AI chat sends/receives messages
- [ ] AI generates code file-by-file
- [ ] Build triggers and streams logs
- [ ] Tests run and report results
- [ ] Debug loop fixes errors
- [ ] Live preview shows running app

**Deployment:**
- [ ] Deploy to staging works
- [ ] Deploy to production works
- [ ] Custom domain setup works
- [ ] SSL certificate provisions
- [ ] Secrets management works
- [ ] Rollback works
- [ ] Auto-rollback on failure works

**Performance:**
- [ ] Dashboard loads < 2 seconds
- [ ] Project creation < 1 second
- [ ] AI analysis starts < 3 seconds
- [ ] File upload < 5 seconds for 10MB
- [ ] Workspace start < 10 seconds
- [ ] 100 concurrent users supported

**Security:**
- [ ] JWT tokens expire correctly
- [ ] Rate limiting works
- [ ] Secrets never exposed in browser/logs
- [ ] Container isolation verified
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] CSRF protection works

### 9.3.5 — Landing Page & Marketing

**Files to create:**
- `apps/web/app/page.tsx` — update landing page
- `apps/web/app/pricing/page.tsx` — pricing page
- `apps/web/components/landing/hero.tsx` — hero section
- `apps/web/components/landing/features.tsx` — features section
- `apps/web/components/landing/how-it-works.tsx` — step-by-step section
- `apps/web/components/landing/pricing-cards.tsx` — pricing tiers
- `apps/web/components/landing/cta.tsx` — call to action
- `apps/web/components/landing/footer.tsx` — footer

**Landing page sections:**
1. Hero: "Describe it. Build it. Ship it." + CTA button
2. How it works: Idea → Requirements → PRD → Design → Architecture → Code → Deploy
3. Features: AI-powered, full-stack, live preview, one-click deploy
4. Pricing: Free / Pro / Team / Enterprise
5. CTA: "Get started for free"

---

## TypeScript Types & Schemas

**Files to create/modify:**
- `packages/types/src/notification.ts` — Notification types
- `packages/schemas/notification.schema.json` — notification schemas

---

## OpenAPI Spec Updates

**Files to modify:**
- `apps/api/api-spec.yaml` — add notification endpoints

---

## Verification Steps

1. **LLM caching:** Same prompt within cache window → cached response returned (verify via cache hit count)
2. **Query performance:** Project listing < 100ms, PRD loading < 200ms
3. **Container startup:** Pre-warmed container assigned in < 2 seconds
4. **Auto-rollback:** Deploy broken code → health check fails → automatic rollback
5. **Circuit breaker:** AI engine down → graceful error message, not 500
6. **Rate limiting:** 101st request in a minute → 429 response
7. **Dark mode:** Toggle works, all components render correctly
8. **Animations:** Page transitions smooth, no jank
9. **Notifications:** Deployment complete → email + in-app notification
10. **Error pages:** 404, 500, etc. show friendly messages with error IDs
11. **Load test:** 100 concurrent users, all endpoints respond within SLA
12. **Full E2E flow:** Create project → analyze → clarify → PRD → design → architecture → develop → test → deploy → live

---

## Implementation Order

1. Database migrations (llm_cache, performance indexes, notifications)
2. LLM semantic caching
3. Database query optimization
4. Container pre-warming pool
5. API response caching
6. Automated rollback + health monitoring
7. Circuit breakers + rate limiting
8. Graceful degradation
9. Structured error handling
10. UI polish (animations, dark mode, typography)
11. Loading states + skeletons
12. Notification system (backend + frontend)
13. Landing page
14. QA checklist + testing
15. End-to-end verification
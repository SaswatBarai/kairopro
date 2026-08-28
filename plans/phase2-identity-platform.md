# Phase 2: Platform Backend & User Identity — Implementation Plan

## Overview

Implement user authentication (JWT + OAuth), organization/project management, and local email integration with MailHog. After this phase, users can sign up, log in, create organizations, manage projects, and receive local test emails.

**Key decisions:**
- Auth: JWT access + refresh tokens, bcrypt password hashing
- OAuth: Google + GitHub (Phase 2 MVP)
- Email: MailHog for local testing (SMTP on port 1025)
- API versioning: `/api/v1/` prefix on all routes

---

## Module 2.1: Authentication & User Management

### 2.1.1 — Database: Users & Auth Tables

**Files to create/modify:**
- `apps/api/migrations/00019_create_auth_tables.sql` — users, sessions, oauth_accounts tables
- `apps/api/migrations/00020_create_organizations.sql` — organizations, organization_members tables

**Schema:**
```sql
-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- sessions (refresh tokens)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT UNIQUE NOT NULL,
  user_agent TEXT,
  ip_address INET,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- oauth_accounts
CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google', 'github'
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- organization_members
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
```

### 2.1.2 — Go Auth API

**Files to create:**
- `apps/api/internal/auth/handler.go` — replace stub with full implementation
- `apps/api/internal/auth/service.go` — auth business logic
- `apps/api/internal/auth/repository.go` — DB queries for auth
- `apps/api/internal/auth/middleware.go` — JWT middleware, requireAuth
- `apps/api/internal/auth/oauth.go` — Google & GitHub OAuth flows
- `apps/api/internal/auth/validator.go` — input validation
- `apps/api/pkg/auth/jwt.go` — JWT generation, validation, refresh
- `apps/api/pkg/auth/hash.go` — bcrypt hashing
- `apps/api/pkg/email/smtp.go` — MailHog SMTP sender
- `apps/api/pkg/email/templates.go` — email template rendering

**Auth endpoints:**
```
POST /api/v1/auth/register     — email/password signup
POST /api/v1/auth/login        — email/password login
POST /api/v1/auth/refresh      — refresh access token
POST /api/v1/auth/logout       — invalidate session
POST /api/v1/auth/oauth/:provider — initiate OAuth flow
GET  /api/v1/auth/oauth/:provider/callback — OAuth callback
POST /api/v1/auth/verify-email — verify email address
POST /api/v1/auth/forgot-password — request password reset
POST /api/v1/auth/reset-password  — reset password with token
GET  /api/v1/auth/me            — get current user
```

**JWT strategy:**
- Access token: 15-minute expiry, signed with HS256
- Refresh token: 7-day expiry, stored in DB sessions table
- Token payload: `{ sub: user_id, email, org_id }`

**OAuth flow:**
1. Frontend redirects to `/api/v1/auth/oauth/google` (or github)
2. Go redirects to provider authorization URL
3. Provider redirects back to callback URL
4. Go exchanges code for tokens, upserts user in `users` + `oauth_accounts`
5. Go issues JWT access + refresh tokens

### 2.1.3 — Next.js Auth UI

**Files to create:**
- `apps/web/app/(auth)/login/page.tsx` — login form (email/password + OAuth buttons)
- `apps/web/app/(auth)/signup/page.tsx` — signup form
- `apps/web/app/(auth)/forgot-password/page.tsx` — forgot password form
- `apps/web/app/(auth)/reset-password/page.tsx` — reset password form
- `apps/web/app/(auth)/verify-email/page.tsx` — email verification page
- `apps/web/app/(auth)/layout.tsx` — auth layout (centered card, no sidebar)
- `apps/web/lib/auth.ts` — auth client utilities (login, signup, token storage)
- `apps/web/lib/api-client.ts` — authenticated fetch wrapper with token refresh
- `apps/web/middleware.ts` — Next.js middleware for route protection
- `apps/web/components/auth/login-form.tsx`
- `apps/web/components/auth/signup-form.tsx`
- `apps/web/components/auth/oauth-buttons.tsx`
- `apps/web/components/auth/forgot-password-form.tsx`

**Auth flow in Next.js:**
- Store access token in memory (not localStorage — XSS risk)
- Store refresh token in httpOnly cookie (set by Go API)
- `middleware.ts` checks for valid session, redirects to `/login` if not authenticated
- `api-client.ts` auto-refreshes tokens on 401 responses

---

## Module 2.2: Project & Organization Management

### 2.2.1 — Database: Projects Table

**Files to create:**
- `apps/api/migrations/00021_create_projects.sql`

**Schema:**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, analyzing, clarification, prd_ready, designing, design_ready, architecture_ready, approved, developing, testing, preview, ready_to_deploy, deploying, live, analysis_failed, build_failed, test_failed, deployment_failed
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

### 2.2.2 — Go Projects/Orgs API

**Files to create:**
- `apps/api/internal/projects/handler.go` — replace stub with full implementation
- `apps/api/internal/projects/service.go` — project business logic
- `apps/api/internal/projects/repository.go` — DB queries for projects
- `apps/api/internal/workspaces/handler.go` — replace stub with workspace endpoints

**Project endpoints:**
```
POST   /api/v1/projects                    — create project
GET    /api/v1/projects                   — list user's projects
GET    /api/v1/projects/:id               — get project
PATCH  /api/v1/projects/:id               — update project
DELETE /api/v1/projects/:id               — archive/delete project
POST   /api/v1/projects/:id/members       — add member
DELETE /api/v1/projects/:id/members/:uid   — remove member
```

**Organization endpoints:**
```
POST   /api/v1/orgs                        — create organization
GET    /api/v1/orgs                        — list user's orgs
GET    /api/v1/orgs/:id                    — get organization
PATCH  /api/v1/orgs/:id                    — update organization
DELETE /api/v1/orgs/:id                    — delete organization
POST   /api/v1/orgs/:id/members            — invite member
DELETE /api/v1/orgs/:id/members/:uid       — remove member
PATCH  /api/v1/orgs/:id/members/:uid       — update member role
```

### 2.2.3 — Dashboard UI

**Files to create:**
- `apps/web/app/dashboard/page.tsx` — replace placeholder with full dashboard
- `apps/web/app/dashboard/layout.tsx` — dashboard layout (sidebar + header)
- `apps/web/components/dashboard/project-card.tsx`
- `apps/web/components/dashboard/create-project-modal.tsx`
- `apps/web/components/dashboard/sidebar.tsx`
- `apps/web/components/dashboard/header.tsx`
- `apps/web/components/dashboard/organization-switcher.tsx`
- `apps/web/lib/projects.ts` — project API client

**Dashboard features:**
- List projects with status badges (LIVE, BUILDING, DRAFT, etc.)
- Create new project modal
- Organization switcher dropdown
- Search/filter projects
- Project card shows: name, status, last updated

---

## Module 2.3: Billing Stubs & Local Notifications

### 2.3.1 — Local Email Integration

**Files to create:**
- `apps/api/pkg/email/smtp.go` — SMTP client pointed to MailHog `localhost:1025`
- `apps/api/pkg/email/templates/welcome.html` — welcome email template
- `apps/api/pkg/email/templates/verify-email.html` — email verification template
- `apps/api/pkg/email/templates/reset-password.html` — password reset template
- `apps/api/pkg/email/templates/invite.html` — org invitation template
- `apps/api/pkg/email/renderer.go` — template rendering with Go html/template

**Email events:**
- User signup → welcome + verify email
- Password reset → reset link email
- Org invitation → invite email
- Project status change → notification email (stub)

### 2.3.2 — Billing Stubs

**Files to create:**
- `apps/api/internal/billing/handler.go` — billing endpoint stubs
- `apps/api/internal/billing/service.go` — billing service stub
- `apps/api/migrations/00022_create_billing_tables.sql`

**Schema (stubs):**
```sql
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY, -- 'free', 'pro', 'team', 'enterprise'
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  ai_credits INTEGER NOT NULL,
  build_minutes INTEGER NOT NULL,
  storage_mb INTEGER NOT NULL,
  max_projects INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, past_due, canceled
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed free plan
INSERT INTO subscription_plans (id, name, price_cents, ai_credits, build_minutes, storage_mb, max_projects)
VALUES ('free', 'Free', 0, 100, 60, 500, 3);
```

**Billing endpoints (stubs):**
```
GET  /api/v1/billing/plans           — list available plans
GET  /api/v1/billing/subscription    — get org's current subscription
POST /api/v1/billing/subscribe       — subscribe to plan (stub: returns 501)
```

---

## TypeScript Types Updates

**Files to create/modify:**
- `packages/types/src/auth.ts` — User, Session, LoginRequest, SignupRequest, TokenResponse
- `packages/types/src/organization.ts` — Organization, OrganizationMember, CreateOrgRequest
- `packages/types/src/project.ts` — update with full Project type, ProjectStatus enum
- `packages/types/src/billing.ts` — Plan, Subscription types

---

## JSON Schema Updates

**Files to create:**
- `packages/schemas/auth.schema.json` — auth request/response schemas
- `packages/schemas/organization.schema.json` — org schemas
- `packages/schemas/billing.schema.json` — billing schemas

---

## OpenAPI Spec Updates

**Files to modify:**
- `apps/api/api-spec.yaml` — add auth, org, project, billing endpoints

---

## Verification Steps

1. **Auth flow:** Register user → receive verification email in MailHog → verify email → login → receive JWT
2. **OAuth flow:** Click "Sign in with Google" → OAuth redirect → callback → JWT issued
3. **Protected routes:** Access `/api/v1/projects` without token → 401; with token → 200
4. **Token refresh:** Access token expires → auto-refresh via refresh token → new access token
5. **Organization:** Create org → invite member → member receives email in MailHog
6. **Project CRUD:** Create project → list projects → update project → archive project
7. **Dashboard UI:** Login → see dashboard → create project → project appears in list
8. **Billing stubs:** GET `/api/v1/billing/plans` → returns free plan; POST `/api/v1/billing/subscribe` → 501

---

## Implementation Order

1. Database migrations (auth, orgs, projects, billing tables)
2. Go auth package (JWT, hashing, middleware)
3. Go auth handlers (register, login, refresh, OAuth)
4. Go email package (SMTP + templates)
5. Go org/project handlers (CRUD)
6. Go billing stubs
7. Next.js auth UI (login, signup, forgot password, OAuth)
8. Next.js auth middleware + API client
9. Next.js dashboard UI (project list, create modal, org switcher)
10. TypeScript types + JSON schemas
11. OpenAPI spec updates
12. End-to-end verification
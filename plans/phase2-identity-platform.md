# Phase 2: Platform Backend & User Identity — Implementation Plan

## Overview

Implement user authentication (NextAuth.js), organization/project management via Next.js API routes + Prisma, and local email integration with MailHog.

**Key decisions:**
- Auth: **NextAuth.js** (Credentials + Google + GitHub providers)
- Sessions: JWT stored in HTTP-only cookies via NextAuth
- ORM: **Prisma** for all DB operations
- Email: **nodemailer** → MailHog locally; Resend/SES in production
- API: All platform routes are **Next.js App Router API routes** (`/app/api/`)

---

## Module 2.1: Authentication & User Management

### 2.1.1 — Prisma Schema: Auth Tables

**File to update:** `apps/web/prisma/schema.prisma`

Add NextAuth-compatible models:
```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  role           String       @default("member") // owner, admin, member
  joinedAt       DateTime     @default(now())
  organization   Organization @relation(fields: [organizationId], references: [id])
  user           User         @relation(fields: [userId], references: [id])

  @@unique([organizationId, userId])
}
```

Run: `prisma migrate dev --name add-auth-tables`

### 2.1.2 — NextAuth Configuration

**Files to create:**
- `apps/web/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- `apps/web/lib/auth.ts` — NextAuth options + session helpers
- `apps/web/lib/email.ts` — nodemailer SMTP client (MailHog)

**`lib/auth.ts`:**
```typescript
import NextAuth, { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { db } from './db'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const user = await db.user.findUnique({ where: { email: credentials!.email } })
        if (!user?.passwordHash) return null
        const valid = await bcrypt.compare(credentials!.password, user.passwordHash)
        return valid ? user : null
      }
    }),
    GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }),
    GitHubProvider({ clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id
      return token
    },
    async session({ session, token }) {
      if (token) session.userId = token.userId as string
      return session
    },
  },
}
```

**`app/api/auth/[...nextauth]/route.ts`:**
```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### 2.1.3 — Auth UI Pages

**Files to create:**
- `apps/web/app/(auth)/layout.tsx` — centered auth layout
- `apps/web/app/(auth)/login/page.tsx` — login form (email/password + OAuth buttons)
- `apps/web/app/(auth)/signup/page.tsx` — signup form
- `apps/web/app/(auth)/forgot-password/page.tsx`
- `apps/web/app/(auth)/reset-password/page.tsx`
- `apps/web/components/auth/login-form.tsx`
- `apps/web/components/auth/signup-form.tsx`
- `apps/web/components/auth/oauth-buttons.tsx`

### 2.1.4 — Next.js Middleware (Route Protection)

**File:** `apps/web/middleware.ts`

```typescript
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  matcher: ['/dashboard/:path*', '/projects/:path*'],
}
```

### 2.1.5 — Signup API Route

**File:** `apps/web/app/api/auth/signup/route.ts`

- Accept `{ email, password, name }`
- Hash password with bcrypt
- Create user in Prisma
- Send welcome email via nodemailer → MailHog
- Return 201

---

## Module 2.2: Organization & Project Management

### 2.2.1 — Prisma Schema: Projects & Orgs

**File to update:** `apps/web/prisma/schema.prisma`

```prisma
model Project {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  slug           String
  description    String?
  state          String   @default("draft")
  createdById    String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdBy      User         @relation(fields: [createdById], references: [id])
  members        ProjectMember[]
  documents      Document[]
  agentRuns      AgentRun[]
  workspace      Workspace?
  deployments    Deployment[]
  prdVersions    PRDVersion[]
  requirements   Requirement[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([organizationId, slug])
}

model ProjectMember {
  id        String   @id @default(cuid())
  projectId String
  userId    String
  role      String   @default("member") // owner, admin, developer, designer, viewer
  project   Project  @relation(fields: [projectId], references: [id])
  user      User     @relation(fields: [userId], references: [id])

  @@unique([projectId, userId])
}
```

Run: `prisma migrate dev --name add-projects`

### 2.2.2 — Next.js API Routes: Projects & Orgs

**Files to create:**

**`apps/web/app/api/projects/route.ts`**
- `GET` — list user's projects (filter by org, paginate)
- `POST` — create project; auto-create org if none; return 201

**`apps/web/app/api/projects/[id]/route.ts`**
- `GET` — get project (check member access)
- `PATCH` — update project name/description/state
- `DELETE` — archive/soft-delete project

**`apps/web/app/api/orgs/route.ts`**
- `GET` — list user's orgs
- `POST` — create org

**`apps/web/app/api/orgs/[id]/route.ts`**
- `GET`, `PATCH`, `DELETE`

**`apps/web/app/api/orgs/[id]/members/route.ts`**
- `GET` — list members
- `POST` — invite member (send invite email)
- `DELETE` — remove member

**Auth helper used in every route:**
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })
  // ...
}
```

### 2.2.3 — Dashboard UI

**Files to create:**
- `apps/web/app/dashboard/page.tsx` — project listing
- `apps/web/app/dashboard/layout.tsx` — sidebar + header layout
- `apps/web/components/dashboard/project-card.tsx`
- `apps/web/components/dashboard/create-project-modal.tsx`
- `apps/web/components/dashboard/sidebar.tsx`
- `apps/web/components/dashboard/header.tsx`
- `apps/web/components/dashboard/organization-switcher.tsx`
- `apps/web/lib/projects.ts` — typed fetch wrappers for project API

---

## Module 2.3: Email Notifications & Billing Stubs

### 2.3.1 — Local Email (MailHog)

**File:** `apps/web/lib/email.ts`

```typescript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'localhost',
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false,
})

export async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: 'KairoPro <noreply@kairopro.in>',
    to,
    subject,
    html,
  })
}
```

Email events:
- Signup → welcome + verify email
- Password reset → reset link
- Org invitation → invite email
- Project state change → notification (Phase 4+)

### 2.3.2 — Billing Stubs

**File:** `apps/web/prisma/schema.prisma` — add billing models:

```prisma
model SubscriptionPlan {
  id           String   @id  // 'free', 'pro', 'team', 'enterprise'
  name         String
  priceCents   Int      @default(0)
  aiCredits    Int
  buildMinutes Int
  storageMb    Int
  maxProjects  Int
  createdAt    DateTime @default(now())
}

model Subscription {
  id                  String   @id @default(cuid())
  organizationId      String   @unique
  planId              String
  status              String   @default("active")
  currentPeriodStart  DateTime
  currentPeriodEnd    DateTime
  organization        Organization        @relation(fields: [organizationId], references: [id])
  plan                SubscriptionPlan    @relation(fields: [planId], references: [id])
  createdAt           DateTime @default(now())
}
```

**File:** `apps/web/app/api/billing/plans/route.ts` — `GET` returns available plans
**File:** `apps/web/app/api/billing/subscribe/route.ts` — `POST` returns 501 Not Implemented (stub)

---

## TypeScript Types Updates

**Files to create/update:**
- `packages/types/src/auth.ts` — User, SignupRequest, LoginRequest, SessionUser
- `packages/types/src/organization.ts` — Organization, OrganizationMember, CreateOrgRequest
- `packages/types/src/project.ts` — Project, ProjectStatus, ProjectMember
- `packages/types/src/billing.ts` — Plan, Subscription

---

## Verification Steps

1. **Signup:** `POST /api/auth/signup` → user created in DB → welcome email in MailHog at `localhost:8025`
2. **Login (credentials):** `POST /api/auth/signin` → session JWT set in cookie
3. **OAuth:** Click Google sign-in → OAuth redirect → callback → session created
4. **Protected route:** Access `/dashboard` without session → redirect to `/login`
5. **Projects CRUD:** Create project → list → update → archive via API
6. **Dashboard UI:** Login → see project list → create project → appears in grid
7. **Billing stub:** `GET /api/billing/plans` → returns free plan; `POST /api/billing/subscribe` → 501

---

## Implementation Order

1. Prisma schema updates (auth, org, project, billing tables) + `prisma migrate dev`
2. NextAuth configuration (`lib/auth.ts`, `[...nextauth]/route.ts`)
3. Signup API route (email + bcrypt)
4. Email lib (nodemailer → MailHog)
5. Org + project API routes (CRUD)
6. Billing stub API routes
7. Next.js middleware (route protection)
8. Auth UI (login, signup, forgot password, OAuth buttons)
9. Dashboard UI (project list, create modal, org switcher)
10. TypeScript types
11. End-to-end verification
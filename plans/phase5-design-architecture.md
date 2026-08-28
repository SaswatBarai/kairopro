# Phase 5: AI Engine — Design & Architecture — Implementation Plan

## Overview

Build the design generation agent and architecture generation agent. After this phase, users can approve a design and architecture, unblocking development.

**Key decisions:**
- Design output: JSON design specification (colors, typography, spacing, components) — not image generation
- Design preview: Next.js renders design tokens as a live CSS preview
- Architecture output: Structured JSON (tech stack, Next.js routes/API routes, Prisma schema, integrations)
- State managed via Next.js API routes + Prisma; FastAPI agents are stateless
- All triggering: Browser → Next.js API route → FastAPI (browser never calls FastAPI)

---

## Module 5.1: Design Generation

### 5.1.1 — Prisma Schema: Design Versions

**File to update:** `apps/web/prisma/schema.prisma`

```prisma
model DesignVersion {
  id            String   @id @default(cuid())
  projectId     String
  version       Int
  designOption  Int      @default(1) // 1, 2, or 3
  name          String   // "Modern SaaS", "Minimal Enterprise", "Dark Premium"
  description   String?
  designSpec    Json     // full design specification
  generatedBy   String   @default("ai")
  isApproved    Boolean  @default(false)
  project       Project  @relation(fields: [projectId], references: [id])
  createdAt     DateTime @default(now())

  @@unique([projectId, version, designOption])
}
```

Run: `prisma migrate dev --name add-design-versions`

**Design spec JSON structure:**
```json
{
  "name": "Modern SaaS",
  "colors": {
    "primary": "#2563EB",
    "secondary": "#7C3AED",
    "background": "#FFFFFF",
    "surface": "#F8FAFC",
    "text": "#0F172A",
    "dark": { "background": "#0F172A", "surface": "#1E293B" }
  },
  "typography": {
    "fontFamily": "Inter",
    "headingScale": { "h1": "2.25rem/700", "h2": "1.875rem/600" },
    "bodyScale": { "base": "1rem/400" }
  },
  "spacing": { "unit": "0.25rem", "scale": [0,1,2,3,4,6,8,12,16] },
  "borderRadius": { "sm": "0.25rem", "md": "0.5rem", "lg": "0.75rem" },
  "components": {
    "button": { "paddingX": "1rem", "paddingY": "0.5rem", "borderRadius": "md" },
    "card": { "padding": "1.5rem", "borderRadius": "lg", "shadow": "md" }
  },
  "layout": {
    "sidebarWidth": "16rem",
    "headerHeight": "4rem",
    "maxContentWidth": "80rem"
  }
}
```

### 5.1.2 — FastAPI Design Agent

**Files to create:**
- `apps/ai/app/agents/design_agent.py` — full implementation
- `apps/ai/app/api/design.py` — design generation endpoints

```python
class DesignAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        prd = context.approved_prd
        references = context.design_references  # uploaded screenshots, if any

        designs = []
        for style in ["modern_saas", "minimal_enterprise", "dark_premium"]:
            await self.emit_event(context.run_id, "agent.thinking", {"step": f"generating {style}"})
            design = await self.llm.complete(
                system=DESIGN_GENERATION_PROMPT,
                user=f"PRD: {prd}\nStyle: {style}\nReferences: {references}",
                response_model=DesignSpec,
            )
            designs.append(design)

        return AgentResult(designs=designs, stateTransition="design_ready")
```

**FastAPI design endpoints (internal):**
```
POST /ai/design          — generate 3 design options
POST /ai/design/modify   — modify a specific design option
```

### 5.1.3 — Next.js Design API Routes

**`apps/web/app/api/projects/[id]/design/route.ts`**
- `GET` — list design versions
- `POST` — trigger design generation (enqueue BullMQ job → FastAPI)

**`apps/web/app/api/projects/[id]/design/[designId]/approve/route.ts`**
- `POST` — approve design, update project state to `design_ready`, mark `DesignVersion.isApproved = true`

### 5.1.4 — Design Preview & Approval UI

**Files to create:**
- `apps/web/app/projects/[projectId]/design/page.tsx`
- `apps/web/components/design/design-preview.tsx` — renders design tokens as live CSS custom properties
- `apps/web/components/design/design-option-card.tsx`
- `apps/web/components/design/design-token-viewer.tsx`
- `apps/web/components/design/reference-upload.tsx` — upload screenshots for AI
- `apps/web/lib/design.ts`

**Preview approach:** Apply design tokens as CSS custom properties on a sample dashboard UI. Show 3 design options side-by-side or as tabs.

---

## Module 5.2: Architecture Generation

### 5.2.1 — Prisma Schema: Architecture Versions

```prisma
model ArchitectureVersion {
  id               String   @id @default(cuid())
  projectId        String
  version          Int
  architectureSpec Json     // structured architecture specification
  generatedBy      String   @default("ai")
  isApproved       Boolean  @default(false)
  project          Project  @relation(fields: [projectId], references: [id])
  createdAt        DateTime @default(now())

  @@unique([projectId, version])
}
```

Run: `prisma migrate dev --name add-architecture-versions`

**Architecture spec JSON structure (aligned to Next.js stack):**
```json
{
  "techStack": {
    "frontend": { "framework": "Next.js 14 App Router", "language": "TypeScript", "uiLibrary": "shadcn/ui + Tailwind" },
    "backend": { "framework": "Next.js API Routes", "orm": "Prisma", "auth": "NextAuth.js" },
    "aiEngine": { "framework": "FastAPI", "language": "Python 3.12" },
    "database": { "engine": "PostgreSQL 16", "extensions": ["pgvector"] },
    "infrastructure": { "containerization": "Docker", "runtime": "ECS/Fargate", "storage": "S3", "cache": "Redis/BullMQ" }
  },
  "frontend": {
    "pages": [
      { "path": "/login", "component": "LoginPage", "auth": false },
      { "path": "/dashboard", "component": "DashboardPage", "auth": true }
    ]
  },
  "backend": {
    "apiRoutes": [
      { "method": "GET", "path": "/api/projects", "description": "List user projects" },
      { "method": "POST", "path": "/api/projects", "description": "Create project" }
    ]
  },
  "database": {
    "prismaModels": ["User", "Organization", "Project", "Document"],
    "relationships": ["User → Project (1:many)"]
  },
  "integrations": {
    "auth": "NextAuth.js (Google, GitHub, Credentials)",
    "storage": "MinIO locally / S3 in production",
    "email": "nodemailer / Resend",
    "queue": "BullMQ / SQS"
  }
}
```

### 5.2.2 — FastAPI Architecture Agent

**Files to create:**
- `apps/ai/app/agents/architecture_agent.py` — full implementation
- `apps/ai/app/api/architecture.py` — endpoints

```python
class ArchitectureAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        prd = context.approved_prd
        design = context.approved_design

        architecture = await self.llm.complete(
            system=ARCHITECTURE_GENERATION_PROMPT,
            user=f"PRD: {prd}\nDesign: {design}",
            response_model=ArchitectureSpec,
        )
        return AgentResult(architecture=architecture, stateTransition="architecture_ready")
```

**FastAPI architecture endpoints (internal):**
```
POST /ai/architecture          — generate architecture
POST /ai/architecture/modify   — modify architecture based on user request
POST /ai/architecture/explain  — explain a specific decision
```

### 5.2.3 — Next.js Architecture API Routes

**`apps/web/app/api/projects/[id]/architecture/route.ts`**
- `GET` — get current architecture version
- `POST` — trigger architecture generation

**`apps/web/app/api/projects/[id]/architecture/approve/route.ts`**
- `POST` — approve architecture → state = `approved`

**`apps/web/app/api/projects/[id]/architecture/modify/route.ts`**
- `POST` — request AI modification (e.g., "Use Prisma instead of raw SQL")

### 5.2.4 — Architecture Review UI

**Files to create:**
- `apps/web/app/projects/[projectId]/architecture/page.tsx`
- `apps/web/components/architecture/architecture-viewer.tsx` — tabbed display
- `apps/web/components/architecture/tech-stack-summary.tsx`
- `apps/web/components/architecture/api-routes-list.tsx`
- `apps/web/components/architecture/db-schema-viewer.tsx`
- `apps/web/components/architecture/ai-chat-panel.tsx` — ask questions about architecture
- `apps/web/lib/architecture.ts`

**Features:**
- Tabs: Tech Stack | Pages & Routes | API Routes | Database | Integrations
- AI chat panel: "Why PostgreSQL?" → FastAPI explains
- Request modification: "Add WebSocket support" → architecture updates
- Version history with diff
- Approve button → unlocks development phase

---

## Verification Steps

1. Design generation: After PRD approval → trigger → 3 design options stored in DB
2. Design preview: CSS custom properties applied; 3 distinct designs render in UI
3. Reference upload: Upload screenshot → design incorporates elements
4. Design approval: Select option → approve → `DesignVersion.isApproved = true`, state = `design_ready`
5. Architecture generation: After design approval → trigger → structured spec produced
6. Architecture review: Tabs render tech stack, routes, DB schema
7. Architecture Q&A: "Why Next.js API routes?" → FastAPI agent explains
8. Architecture modification: "Add email provider" → spec updated
9. Architecture approval: Approve → state = `approved`

---

## Implementation Order

1. Prisma schema (DesignVersion, ArchitectureVersion) + migrate
2. FastAPI design agent
3. FastAPI architecture agent
4. BullMQ workers for design + architecture generation (Next.js side)
5. Next.js design API routes (generate, list, approve)
6. Next.js architecture API routes (generate, get, approve, modify)
7. Next.js design preview UI (3 options, CSS tokens preview, approval)
8. Next.js architecture review UI (tabbed, AI chat, approval)
9. TypeScript types (`DesignVersion`, `DesignSpec`, `ArchitectureVersion`, `ArchitectureSpec`)
10. End-to-end verification
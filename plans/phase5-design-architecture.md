# Phase 5: AI Engine — Design & Architecture — Implementation Plan

## Overview

Build the design generation agent (produces design specs/tokens from PRD + optional user screenshots) and the architecture generation agent (produces tech stack, component tree, API routes, DB schema from PRD + design). After this phase, users can approve a design and architecture, unblocking the development phase.

**Key decisions:**
- Design output: JSON design specification (colors, typography, spacing, components) — not image generation
- Design preview: Next.js renders design tokens as a live preview
- Architecture output: Structured JSON (tech stack, components, routes, DB schema, API endpoints)
- User approval: Required for both design and architecture before proceeding

---

## Module 5.1: Design Generation

### 5.1.1 — Database: Design Versions Table

**Files to create:**
- `apps/api/migrations/00027_create_design_versions.sql`

**Schema:**
```sql
CREATE TABLE design_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  design_option INTEGER NOT NULL DEFAULT 1, -- 1, 2, or 3 (multiple options per generation)
  name TEXT NOT NULL, -- e.g., "Modern SaaS", "Minimal Enterprise", "Dark Premium"
  description TEXT,
  design_spec JSONB NOT NULL, -- full design specification
  generated_by TEXT NOT NULL DEFAULT 'ai',
  parent_version_id UUID REFERENCES design_versions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, version, design_option)
);

CREATE INDEX idx_design_versions_project ON design_versions(project_id);
```

**Design spec structure (JSONB):**
```json
{
  "name": "Modern SaaS",
  "description": "Clean, professional design with a modern feel",
  "colors": {
    "primary": "#2563EB",
    "primaryHover": "#1D4ED8",
    "secondary": "#7C3AED",
    "background": "#FFFFFF",
    "surface": "#F8FAFC",
    "text": "#0F172A",
    "textSecondary": "#64748B",
    "border": "#E2E8F0",
    "success": "#10B981",
    "warning": "#F59E0B",
    "error": "#EF4444",
    "dark": {
      "primary": "#3B82F6",
      "background": "#0F172A",
      "surface": "#1E293B",
      "text": "#F8FAFC",
      "textSecondary": "#94A3B8",
      "border": "#334155"
    }
  },
  "typography": {
    "fontFamily": "Inter",
    "headingScale": { "h1": "2.25rem/700", "h2": "1.875rem/600", "h3": "1.5rem/600" },
    "bodyScale": { "base": "1rem/400", "small": "0.875rem/400" }
  },
  "spacing": { "unit": "0.25rem", "scale": [0, 1, 2, 3, 4, 6, 8, 12, 16] },
  "borderRadius": { "sm": "0.25rem", "md": "0.5rem", "lg": "0.75rem", "xl": "1rem", "full": "9999px" },
  "shadows": { "sm": "0 1px 2px rgba(0,0,0,0.05)", "md": "0 4px 6px rgba(0,0,0,0.1)", "lg": "0 10px 15px rgba(0,0,0,0.1)" },
  "components": {
    "button": { "paddingX": "1rem", "paddingY": "0.5rem", "borderRadius": "md" },
    "card": { "padding": "1.5rem", "borderRadius": "lg", "shadow": "md" },
    "input": { "paddingX": "0.75rem", "paddingY": "0.5rem", "borderRadius": "md" }
  },
  "layout": {
    "sidebarWidth": "16rem",
    "headerHeight": "4rem",
    "maxContentWidth": "80rem",
    "mobileBreakpoint": "768px"
  },
  "screens": {
    "dashboard": { "description": "Main dashboard with project cards and stats" },
    "login": { "description": "Clean login form with social auth buttons" },
    "projectOverview": { "description": "Project workspace with file tree and editor" }
  }
}
```

### 5.1.2 — Design Agent

**Files to create:**
- `apps/ai/app/agents/design_agent.py` — full implementation
- `apps/ai/app/api/design.py` — update with full endpoints

**Design agent flow:**
```python
class DesignAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        # 1. Get approved PRD
        prd = await self.get_approved_prd(context.project_id)
        
        # 2. Get any user-uploaded design references
        references = await self.get_design_references(context.project_id)
        
        # 3. Generate 3 design options
        designs = []
        for i, style in enumerate(["modern_sass", "minimal_enterprise", "dark_premium"]):
            design = await self.generate_design(prd, references, style, option_number=i+1)
            designs.append(design)
        
        # 4. Store all design versions
        for design in designs:
            await self.store_design_version(context.project_id, design)
        
        return AgentResult(designs=designs, state_transition="design_ready")
```

**Design generation strategy:**
- LLM receives PRD + any uploaded screenshots/references
- Generates 3 distinct design directions with full token specifications
- If user uploads screenshots, LLM analyzes layout/colors/typography and incorporates
- Output is pure JSON (no image generation) — rendered by Next.js preview

### 5.1.3 — Design Preview & Approval UI

**Files to create:**
- `apps/web/app/projects/[projectId]/design/page.tsx` — design selection page
- `apps/web/components/design/design-preview.tsx` — renders design tokens as live preview
- `apps/web/components/design/design-option-card.tsx` — design option selector
- `apps/web/components/design/design-token-viewer.tsx` — view raw design tokens
- `apps/web/components/design/reference-upload.tsx` — upload design references
- `apps/web/lib/design.ts` — design API client

**Design preview approach:**
- Apply design tokens as CSS custom properties on a sample UI
- Show 3 design options side-by-side
- Each option renders: dashboard preview, login preview, component preview
- User selects one → "Approve Design" button
- Can also upload screenshots as references before generating

**Design endpoints:**
```
POST /api/v1/projects/:id/generate-design   — trigger design generation (3 options)
GET  /api/v1/projects/:id/designs            — list design options
GET  /api/v1/projects/:id/designs/:id        — get specific design
POST /api/v1/projects/:id/designs/:id/approve — approve a design
POST /api/v1/projects/:id/designs/:id/modify  — request AI modification
```

---

## Module 5.2: Architecture Generation

### 5.2.1 — Database: Architecture Versions Table

**Files to create:**
- `apps/api/migrations/00028_create_architecture_versions.sql`

**Schema:**
```sql
CREATE TABLE architecture_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  architecture_spec JSONB NOT NULL,
  generated_by TEXT NOT NULL DEFAULT 'ai',
  parent_version_id UUID REFERENCES architecture_versions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, version)
);

CREATE INDEX idx_architecture_versions_project ON architecture_versions(project_id);
```

**Architecture spec structure (JSONB):**
```json
{
  "name": "Employee Management System Architecture",
  "techStack": {
    "frontend": { "framework": "Next.js 14", "language": "TypeScript", "uiLibrary": "shadcn/ui + Tailwind CSS" },
    "backend": { "framework": "Go (Chi)", "language": "Go", "apiStyle": "REST" },
    "database": { "engine": "PostgreSQL", "extensions": ["pgvector"], "orm": "sqlc" },
    "ai": { "framework": "FastAPI", "language": "Python", "llm": "OpenAI GPT-4o" },
    "infrastructure": { "containerization": "Docker", "runtime": "ECS/Fargate", "storage": "S3", "cache": "Redis" }
  },
  "frontend": {
    "components": [
      { "name": "LoginForm", "route": "/login", "description": "Email/password + OAuth login" },
      { "name": "Dashboard", "route": "/dashboard", "description": "Project listing and stats" },
      { "name": "ProjectOverview", "route": "/projects/:id/overview", "description": "Project workspace" }
    ],
    "pages": [
      { "path": "/", "component": "LandingPage", "auth": false },
      { "path": "/login", "component": "LoginPage", "auth": false },
      { "path": "/dashboard", "component": "DashboardPage", "auth": true },
      { "path": "/projects/:id/overview", "component": "ProjectOverviewPage", "auth": true }
    ],
    "stateManagement": "React Query + Zustand",
    "apiClient": "Authenticated fetch wrapper"
  },
  "backend": {
    "routes": [
      { "method": "POST", "path": "/api/v1/auth/register", "handler": "auth.Register" },
      { "method": "POST", "path": "/api/v1/auth/login", "handler": "auth.Login" },
      { "method": "GET", "path": "/api/v1/projects", "handler": "projects.List" },
      { "method": "POST", "path": "/api/v1/projects", "handler": "projects.Create" }
    ],
    "middleware": ["auth", "logging", "cors", "rateLimiting"],
    "services": ["auth", "projects", "workspaces", "files", "agents"]
  },
  "database": {
    "tables": [
      { "name": "users", "columns": ["id UUID PK", "email TEXT UNIQUE", "password_hash TEXT", "..."] },
      { "name": "projects", "columns": ["id UUID PK", "organization_id UUID FK", "name TEXT", "..."] }
    ],
    "relationships": ["users → projects (1:many)", "organizations → projects (1:many)"]
  },
  "integrations": {
    "auth": "JWT + OAuth (Google, GitHub)",
    "storage": "S3 (MinIO locally)",
    "email": "SMTP (MailHog locally)",
    "monitoring": "OpenTelemetry + Jaeger"
  }
}
```

### 5.2.2 — Architecture Agent

**Files to create:**
- `apps/ai/app/agents/architecture_agent.py` — replace stub with full implementation
- `apps/ai/app/api/architecture.py` — update with full endpoints

**Architecture agent flow:**
```python
class ArchitectureAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        # 1. Get approved PRD
        prd = await self.get_approved_prd(context.project_id)
        
        # 2. Get approved design
        design = await self.get_approved_design(context.project_id)
        
        # 3. Generate architecture spec
        architecture = await self.generate_architecture(prd, design)
        
        # 4. Store architecture version
        version = await self.store_architecture_version(context.project_id, architecture)
        
        return AgentResult(architecture_version=version, state_transition="architecture_ready")
```

**Architecture generation strategy:**
- LLM receives PRD + approved design spec
- Generates structured architecture matching KairoPro's tech stack (Next.js, Go, FastAPI, PostgreSQL)
- Includes: tech stack, frontend components/pages, backend routes/services, DB schema, integrations
- User can ask "Why PostgreSQL?" and get an explanation
- User can request changes ("Change backend to Node.js") and architecture updates accordingly

### 5.2.3 — Architecture Review UI

**Files to create:**
- `apps/web/app/projects/[projectId]/architecture/page.tsx` — architecture review page
- `apps/web/components/architecture/architecture-viewer.tsx` — renders architecture spec
- `apps/web/components/architecture/tech-stack-summary.tsx` — tech stack display
- `apps/web/components/architecture/component-tree.tsx` — frontend component tree
- `apps/web/components/architecture/api-routes-list.tsx` — backend API routes
- `apps/web/components/architecture/db-schema-viewer.tsx` — database schema visualization
- `apps/web/components/architecture/ai-chat-panel.tsx` — ask questions about architecture
- `apps/web/lib/architecture.ts` — architecture API client

**Architecture review features:**
- Tabbed view: Tech Stack | Frontend | Backend | Database | Integrations
- Interactive component tree (expand/collapse)
- "Ask AI" panel to question or modify architecture
- Version history with diff
- "Approve Architecture" button to proceed to development

**Architecture endpoints:**
```
POST /api/v1/projects/:id/generate-architecture  — trigger architecture generation
GET  /api/v1/projects/:id/architecture            — get current architecture
GET  /api/v1/projects/:id/architecture/versions   — list versions
POST /api/v1/projects/:id/architecture/modify      — request AI modification
POST /api/v1/projects/:id/architecture/approve    — approve architecture
```

---

## TypeScript Types & Schemas

**Files to create/modify:**
- `packages/types/src/design.ts` — DesignVersion, DesignSpec, ColorPalette, Typography, etc.
- `packages/types/src/architecture.ts` — ArchitectureVersion, TechStack, ComponentDef, RouteDef, etc.
- `packages/schemas/design.schema.json` — design spec schema
- `packages/schemas/architecture.schema.json` — architecture spec schema

---

## OpenAPI Spec Updates

**Files to modify:**
- `apps/api/api-spec.yaml` — add design and architecture endpoints
- `apps/ai/api-spec.yaml` — add design and architecture generation endpoints

---

## Verification Steps

1. **Design generation:** After PRD approval → trigger design generation → 3 design options produced
2. **Design preview:** Each design option renders correctly as live CSS preview
3. **Design reference:** Upload screenshot → design incorporates reference elements
4. **Design approval:** Select design → approve → project state transitions to `design_ready`
5. **Architecture generation:** After design approval → trigger architecture → structured spec produced
6. **Architecture review:** View tech stack, components, routes, DB schema in UI
7. **Architecture Q&A:** Ask "Why PostgreSQL?" → AI explains rationale
8. **Architecture modification:** Request "Change backend to Node.js" → architecture updates
9. **Architecture approval:** Approve → project state transitions to `architecture_ready`
10. **State flow:** draft → analyzing → clarification → prd_ready → designing → design_ready → architecture_ready → approved

---

## Implementation Order

1. Database migrations (design_versions, architecture_versions)
2. FastAPI design agent
3. FastAPI architecture agent
4. Go design + architecture API endpoints
5. Next.js design preview UI (3 options, live preview, approval)
6. Next.js architecture review UI (tabbed view, AI chat, approval)
7. TypeScript types + JSON schemas
8. OpenAPI spec updates
9. End-to-end verification
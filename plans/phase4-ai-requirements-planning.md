# Phase 4: AI Engine — Requirements & Planning — Implementation Plan

## Overview

Build the AI orchestration framework, requirement analysis agent, clarification loop, and PRD generation with versioned editing. After this phase, KairoPro can analyze a vague prompt + uploaded documents, ask clarification questions, and produce a structured, editable PRD.

**Key decisions:**
- Agent framework: Custom state machine in FastAPI (Python), no LangChain dependency
- State persistence: PostgreSQL via Prisma (managed by Next.js API)
- LLM: OpenAI GPT-4o (pluggable via provider abstraction)
- Event streaming: Redis pub/sub → Next.js SSE route → browser
- PRD editor: TipTap in Next.js
- All agent triggering: Browser → Next.js API route → FastAPI (never browser → FastAPI directly)

---

## Module 4.1: AI Orchestration Framework

### 4.1.1 — Prisma Schema: Agent Tables

**File to update:** `apps/web/prisma/schema.prisma`

```prisma
model AgentRun {
  id          String    @id @default(cuid())
  projectId   String
  agentType   String    // requirement, prd, design, architecture, developer, testing, debug
  status      String    @default("pending") // pending, running, completed, failed, cancelled
  input       Json      @default("{}")
  output      Json?
  error       String?
  startedAt   DateTime?
  completedAt DateTime?
  project     Project   @relation(fields: [projectId], references: [id])
  messages    AgentMessage[]
  events      AgentEvent[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model AgentMessage {
  id         String   @id @default(cuid())
  agentRunId String
  role       String   // system, user, assistant, tool
  content    String
  metadata   Json     @default("{}")
  agentRun   AgentRun @relation(fields: [agentRunId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
}

model AgentEvent {
  id         String   @id @default(cuid())
  agentRunId String
  eventType  String   // agent.started, agent.thinking, file.created, test.passed, etc.
  data       Json     @default("{}")
  agentRun   AgentRun @relation(fields: [agentRunId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
}
```

Run: `prisma migrate dev --name add-agent-tables`

### 4.1.2 — FastAPI Orchestrator

**Files to create:**
- `apps/ai/app/agents/orchestrator.py` — full implementation
- `apps/ai/app/agents/base_agent.py` — abstract base class
- `apps/ai/app/agents/state_machine.py` — allowed state transitions
- `apps/ai/app/llm/provider.py` — pluggable LLM interface
- `apps/ai/app/llm/openai_provider.py` — OpenAI GPT-4o implementation

**Orchestrator:**
```python
class Orchestrator:
    def __init__(self, db_url: str, redis_url: str, llm_provider: LLMProvider):
        self.db = AsyncPrismaClient(db_url)  # or psycopg2
        self.redis = Redis.from_url(redis_url)
        self.llm = llm_provider
        self.agents = {
            "requirement": RequirementAgent(llm_provider),
            "prd": PRDAgent(llm_provider),
            "design": DesignAgent(llm_provider),
            "architecture": ArchitectureAgent(llm_provider),
            "developer": DeveloperAgent(llm_provider),
        }

    async def start_analysis(self, project_id: str, run_id: str) -> AgentResult:
        await self.emit_event(run_id, "agent.started", {})
        result = await self.agents["requirement"].run(AgentContext(project_id=project_id, run_id=run_id))
        await self.emit_event(run_id, "agent.completed", {"result": result.model_dump()})
        return result

    async def emit_event(self, run_id: str, event_type: str, data: dict):
        """Publish to Redis channel, Next.js SSE route subscribes."""
        payload = json.dumps({"runId": run_id, "type": event_type, "data": data})
        await self.redis.publish(f"project-events:{run_id}", payload)
```

**Base agent:**
```python
class BaseAgent(ABC):
    def __init__(self, llm: LLMProvider):
        self.llm = llm

    @abstractmethod
    async def run(self, context: AgentContext) -> AgentResult:
        pass
```

**State machine transitions:**
```
draft → analyzing → clarification → prd_ready → designing →
design_ready → architecture_ready → approved → developing →
testing → preview → deploying → live
```

### 4.1.3 — Next.js API Routes: Agent Runs

**Files to create:**

**`apps/web/app/api/projects/[id]/analyze/route.ts`**
- `POST` — create AgentRun record, enqueue BullMQ `ai-analysis` job
- Job calls `callAI('/ai/analyze', { projectId, runId, ... })`

**`apps/web/app/api/projects/[id]/agent-runs/route.ts`**
- `GET` — list agent runs for project

**`apps/web/app/api/projects/[id]/agent-runs/[runId]/route.ts`**
- `GET` — get agent run details + events

**`apps/web/app/api/projects/[id]/events/route.ts`** — SSE stream
```typescript
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const stream = new ReadableStream({
    async start(controller) {
      const subscriber = redis.duplicate()
      // Subscribe to all agent runs for this project
      await subscriber.subscribe(`project-events:${params.id}`)
      subscriber.on('message', (_, message) => {
        controller.enqueue(`data: ${message}\n\n`)
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

---

## Module 4.2: Requirement Analysis & Clarification

### 4.2.1 — Prisma Schema: Requirements

```prisma
model Requirement {
  id                   String   @id @default(cuid())
  projectId            String
  title                String
  description          String
  category             String   // business, functional, non_functional, ui, security, data, integration
  priority             String   @default("medium") // critical, high, medium, low
  confidence           Float    @default(0)       // 0.0 to 1.0
  source               String   // user_input, document, ai_inference
  sourceDocumentId     String?
  status               String   @default("draft") // draft, clarifying, locked, approved
  clarificationQuestion String?
  clarificationOptions Json?
  userAnswer           String?
  metadata             Json     @default("{}")
  project              Project  @relation(fields: [projectId], references: [id])
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

Run: `prisma migrate dev --name add-requirements`

### 4.2.2 — FastAPI Requirement Agent

**Files to create:**
- `apps/ai/app/agents/requirement_agent.py` — full implementation

```python
class RequirementAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        await self.emit_event(context.run_id, "agent.thinking", {"step": "retrieving context"})

        # 1. Search knowledge base for relevant chunks
        knowledge = await self.search_knowledge(context.project_id, context.problem_statement)

        await self.emit_event(context.run_id, "agent.thinking", {"step": "extracting requirements"})

        # 2. Extract requirements via LLM (structured output)
        requirements = await self.llm.complete(
            system=REQUIREMENT_EXTRACTION_PROMPT,
            user=f"Problem: {context.problem_statement}\n\nContext: {knowledge}",
            response_model=list[Requirement],
        )

        # 3. Generate clarifications for low-confidence requirements
        clarifications = [r for r in requirements if r.confidence < 0.7]

        state = "clarification" if clarifications else "prd_ready"

        return AgentResult(
            requirements=requirements,
            clarifications=clarifications,
            stateTransition=state,
        )
```

**FastAPI requirement endpoints (internal):**
```
POST /ai/analyze        — run requirement analysis
POST /ai/clarify        — process user answers, re-analyze
```

### 4.2.3 — Next.js Requirement API Routes

**`apps/web/app/api/projects/[id]/requirements/route.ts`**
- `GET` — list requirements
- `PATCH` — update requirement (lock, approve, submit user answer)

**`apps/web/app/api/projects/[id]/clarify/route.ts`**
- `POST` — submit clarification answers → enqueue re-analysis job

### 4.2.4 — Clarification UI

**Files to create:**
- `apps/web/components/ai/clarification-panel.tsx` — question/answer UI
- `apps/web/components/ai/requirement-list.tsx` — requirements with confidence badges
- `apps/web/components/ai/analysis-progress.tsx` — live progress via SSE

**UI flow:**
1. User enters problem statement + uploads files → clicks "Analyze"
2. Frontend calls `POST /api/projects/:id/analyze`
3. SSE events stream agent progress to UI
4. Clarification questions appear in panel
5. User answers → `POST /api/projects/:id/clarify`
6. Requirements shown with confidence scores
7. User locks requirements when satisfied

---

## Module 4.3: PRD Generation & Editing

### 4.3.1 — Prisma Schema: PRD Versions

```prisma
model PRDVersion {
  id              String    @id @default(cuid())
  projectId       String
  version         Int
  content         Json      // structured PRD JSON
  contentMarkdown String
  generatedBy     String    @default("ai") // ai, user
  changeSummary   String?
  parentVersionId String?
  project         Project   @relation(fields: [projectId], references: [id])
  createdAt       DateTime  @default(now())

  @@unique([projectId, version])
}
```

### 4.3.2 — FastAPI PRD Agent

**File:** `apps/ai/app/agents/prd_agent.py`

```python
class PRDAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        requirements = context.locked_requirements
        knowledge = await self.search_knowledge(context.project_id, "product requirements")

        prd = await self.llm.complete(
            system=PRD_GENERATION_PROMPT,
            user=f"Requirements: {requirements}\n\nContext: {knowledge}",
            response_model=PRDDocument,
        )

        return AgentResult(prd=prd, stateTransition="prd_ready")
```

PRD content schema:
```json
{
  "title": "Employee Management System",
  "overview": { "problem": "...", "targetAudience": "...", "goals": [] },
  "personas": [{ "role": "Admin", "needs": [], "journeys": [] }],
  "features": [{
    "id": "feat-1",
    "title": "User Authentication",
    "userStory": "As a user, I want to...",
    "acceptanceCriteria": [],
    "priority": "high",
    "dependencies": []
  }],
  "businessRules": [],
  "functionalRequirements": [],
  "nonFunctionalRequirements": [],
  "securityRequirements": []
}
```

### 4.3.3 — Next.js PRD API Routes

**`apps/web/app/api/projects/[id]/prd/route.ts`**
- `GET` — get current (latest) PRD version
- `POST` — trigger PRD generation (enqueue BullMQ job)

**`apps/web/app/api/projects/[id]/prd/versions/route.ts`**
- `GET` — list all PRD versions

**`apps/web/app/api/projects/[id]/prd/approve/route.ts`**
- `POST` — approve PRD, update project state to `design_ready`

### 4.3.4 — PRD Editor (Next.js)

**Files to create:**
- `apps/web/app/projects/[projectId]/prd/page.tsx`
- `apps/web/components/editor/prd-editor.tsx` — TipTap rich text editor
- `apps/web/components/editor/prd-toolbar.tsx`
- `apps/web/components/editor/prd-sidebar.tsx` — section navigation
- `apps/web/components/editor/version-history.tsx` — diff viewer + restore
- `apps/web/components/editor/ai-edit-panel.tsx` — "ask AI to modify" panel
- `apps/web/lib/prd.ts` — typed API client for PRD routes

**Features:**
- TipTap editor with markdown support + structured section nav
- AI edit: send selected section to `POST /ai/prd/edit` → update PRD
- Version history with diff view and restore
- Export to PDF/Markdown
- Auto-save (debounced, creates new version on significant changes)

---

## Verification Steps

1. **Analysis:** Enter problem statement → `POST /api/projects/:id/analyze` → SSE events stream to UI
2. **Clarification:** Low-confidence requirements show questions; user submits answers via `POST .../clarify`; agent re-runs
3. **Requirements:** All requirements ≥ 0.7 confidence → user locks → state transitions to `prd_ready`
4. **PRD generation:** `POST .../prd` → FastAPI PRD agent runs → PRD JSON stored in DB
5. **Editor:** Open PRD → TipTap renders it → edits save as new version
6. **AI edit:** Ask AI to modify a section → PRD updated
7. **Version history:** View list → compare two versions → restore previous
8. **State transitions:** Verified: `draft → analyzing → clarification → prd_ready`
9. **SSE streaming:** Agent events appear in browser in real time (check DevTools Network → EventStream)

---

## Implementation Order

1. Prisma schema (AgentRun, AgentMessage, AgentEvent, Requirement, PRDVersion) + migrate
2. FastAPI LLM provider (OpenAI, pluggable interface)
3. FastAPI base agent + orchestrator
4. FastAPI requirement agent (RAG + structured output)
5. FastAPI PRD agent
6. BullMQ AI analysis worker (Next.js side)
7. Next.js agent run API routes (analyze, clarify, agent-runs)
8. Next.js SSE events route (Redis pub/sub → SSE)
9. Next.js requirement API routes (list, update, lock)
10. Next.js PRD API routes (generate, get, versions, approve)
11. Next.js analysis progress UI (SSE listener)
12. Next.js clarification UI
13. Next.js PRD editor (TipTap + version history + AI edit)
14. TypeScript types
15. End-to-end verification
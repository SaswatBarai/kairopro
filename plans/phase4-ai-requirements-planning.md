# Phase 4: AI Engine — Requirements & Planning — Implementation Plan

## Overview

Build the AI orchestration framework, requirement analysis agent, clarification loop, and PRD generation with versioned editing. After this phase, KairoPro can analyze a vague prompt + uploaded documents, ask clarification questions, and produce a structured, editable PRD.

**Key decisions:**
- Agent framework: Custom state machine in Python (no LangChain dependency for orchestration)
- LLM: OpenAI GPT-4o (pluggable via LLM module)
- State machine: PostgreSQL-backed project states
- PRD editor: TipTap (rich text editor) in Next.js
- PRD versioning: Full version history with diff

---

## Module 4.1: AI Orchestration Framework

### 4.1.1 — Database: Agent State Tables

**Files to create:**
- `apps/api/migrations/00024_create_agent_tables.sql`

**Schema:**
```sql
-- Agent run tracking
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL, -- 'requirement', 'prd', 'design', 'architecture', 'developer', 'testing', 'debugging'
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, cancelled
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'system', 'user', 'assistant', 'tool'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'agent.started', 'agent.thinking', 'file.created', 'file.updated', 'command.started', 'command.completed', 'test.started', 'test.failed', 'test.passed', 'build.started', 'build.completed', 'deployment.started', 'deployment.completed'
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project state tracking
ALTER TABLE projects ADD COLUMN current_state TEXT NOT NULL DEFAULT 'draft';
-- States: draft, analyzing, clarification, prd_ready, designing, design_ready, architecture_ready, approved, developing, testing, preview, ready_to_deploy, deploying, live, analysis_failed, build_failed, test_failed, deployment_failed

CREATE INDEX idx_agent_runs_project ON agent_runs(project_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_messages_run ON agent_messages(agent_run_id);
CREATE INDEX idx_agent_events_run ON agent_events(agent_run_id);
```

### 4.1.2 — FastAPI Orchestrator

**Files to create:**
- `apps/ai/app/agents/orchestrator.py` — replace stub with full implementation
- `apps/ai/app/agents/base_agent.py` — abstract base agent class
- `apps/ai/app/agents/state_machine.py` — project state machine
- `apps/ai/app/llm/provider.py` — LLM provider abstraction
- `apps/ai/app/llm/openai_provider.py` — OpenAI implementation
- `apps/ai/app/llm/__init__.py` — update with exports

**Orchestrator:**
```python
class Orchestrator:
    """Manages agent lifecycle and project state transitions."""
    
    def __init__(self, db, redis, llm_provider):
        self.db = db
        self.redis = redis
        self.llm = llm_provider
        self.agents = {
            "requirement": RequirementAgent(llm_provider),
            "prd": PRDAgent(llm_provider),
            "design": DesignAgent(llm_provider),
            "architecture": ArchitectureAgent(llm_provider),
            "developer": DeveloperAgent(llm_provider),
        }
    
    async def start_analysis(self, project_id: str) -> str:
        """Start requirement analysis for a project."""
        pass
    
    async def process_clarification_answers(self, project_id: str, answers: list) -> str:
        """Process user answers to clarification questions."""
        pass
    
    async def generate_prd(self, project_id: str) -> str:
        """Generate PRD from locked requirements."""
        pass
    
    async def transition_state(self, project_id: str, new_state: str) -> None:
        """Transition project to new state with validation."""
        pass
```

**Base agent:**
```python
class BaseAgent(ABC):
    """Abstract base class for all AI agents."""
    
    def __init__(self, llm_provider: LLMProvider):
        self.llm = llm_provider
    
    @abstractmethod
    async def run(self, context: AgentContext) -> AgentResult:
        """Execute the agent's task."""
        pass
    
    async def emit_event(self, run_id: str, event_type: str, data: dict):
        """Emit an event to the agent_events table and SSE stream."""
        pass
```

**State machine transitions:**
```
draft → analyzing (on "start analysis")
analyzing → clarification (if low confidence)
analyzing → prd_ready (if high confidence)
clarification → analyzing (on user answers)
prd_ready → designing (on "start design")
designing → design_ready (on design complete)
design_ready → architecture_ready (on architecture complete)
architecture_ready → approved (on user approval)
approved → developing (on "start development")
... etc
```

### 4.1.3 — Go Agent Run API

**Files to create:**
- `apps/api/internal/projects/agent_handler.go` — agent run endpoints
- `apps/api/internal/projects/agent_service.go` — agent run business logic
- `apps/api/internal/ai/client.go` — update with agent run methods

**Agent endpoints:**
```
POST /api/v1/projects/:id/analyze           — start requirement analysis
POST /api/v1/projects/:id/clarify            — submit clarification answers
POST /api/v1/projects/:id/generate-prd       — trigger PRD generation
GET  /api/v1/projects/:id/agent-runs          — list agent runs
GET  /api/v1/projects/:id/agent-runs/:runId   — get agent run details
GET  /api/v1/projects/:id/events             — SSE stream of agent events
```

**Communication flow:**
1. Client calls Go API endpoint (e.g., `POST /analyze`)
2. Go creates `agent_runs` record with status `pending`
3. Go enqueues job to Redis or calls FastAPI directly
4. FastAPI agent picks up job, updates status to `running`
5. Agent emits events to `agent_events` table
6. Go SSE endpoint streams events to client
7. Agent completes, Go updates project state

---

## Module 4.2: Requirement Analysis & Clarification

### 4.2.1 — Database: Requirements Table

**Files to create:**
- `apps/api/migrations/00025_create_requirements.sql`

**Schema:**
```sql
CREATE TABLE requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'business', 'functional', 'non_functional', 'ui', 'security', 'data', 'integration', 'deployment'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  confidence FLOAT NOT NULL DEFAULT 0.0, -- 0.0 to 1.0
  source TEXT NOT NULL, -- 'user_input', 'document', 'ai_inference'
  source_document_id UUID REFERENCES documents(id),
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'clarifying', 'locked', 'approved'
  clarification_question TEXT,
  clarification_options JSONB, -- array of options for multiple choice
  user_answer TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE requirement_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id),
  chunk_id UUID REFERENCES document_chunks(id),
  relevance_score FLOAT,
  excerpt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_requirements_project ON requirements(project_id);
CREATE INDEX idx_requirements_status ON requirements(status);
CREATE INDEX idx_requirements_confidence ON requirements(confidence);
```

### 4.2.2 — Requirement Agent

**Files to create:**
- `apps/ai/app/agents/requirement_agent.py` — replace stub with full implementation
- `apps/ai/app/rag/retriever.py` — update with requirement-specific retrieval
- `apps/ai/app/api/requirements.py` — update with full endpoints

**Requirement agent flow:**
```python
class RequirementAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        # 1. Gather all project context
        documents = await self.get_project_documents(context.project_id)
        knowledge = await self.search_knowledge_base(context.project_id, context.problem_statement)
        
        # 2. Extract requirements from documents + problem statement
        requirements = await self.extract_requirements(context.problem_statement, knowledge, documents)
        
        # 3. Assess confidence for each requirement
        for req in requirements:
            req.confidence = await self.assess_confidence(req, knowledge)
        
        # 4. Generate clarification questions for low-confidence requirements
        clarifications = await self.generate_clarifications(requirements)
        
        return AgentResult(
            requirements=requirements,
            clarifications=clarifications,
            state_transition="clarification" if clarifications else "prd_ready"
        )
```

**Requirement extraction prompt strategy:**
- System prompt instructs LLM to analyze input and extract structured requirements
- Each requirement includes: title, description, category, priority, confidence, source
- Low-confidence requirements (< 0.7) generate clarification questions
- Requirements are linked to source documents via `requirement_sources`

**Clarification question types:**
- Multiple choice: "Which authentication method?" with options
- Open-ended: "What specific features does the admin need?"
- Confirmation: "Should this feature be included?"

### 4.2.3 — Clarification UI

**Files to create:**
- `apps/web/app/projects/[projectId]/overview/page.tsx` — update with analysis trigger
- `apps/web/components/ai/clarification-panel.tsx` — clarification question/answer UI
- `apps/web/components/ai/requirement-list.tsx` — requirement display with confidence scores
- `apps/web/components/ai/analysis-progress.tsx` — analysis progress indicator
- `apps/web/lib/ai.ts` — AI API client for agent interactions

**Clarification UI flow:**
1. User enters problem statement + uploads files
2. Clicks "Analyze Requirements"
3. Analysis progress shows (streaming events via SSE)
4. If clarification needed: questions appear in panel
5. User answers questions (multiple choice or free text)
6. Answers submitted → agent re-analyzes
7. Requirements displayed with confidence scores
8. User can lock requirements when satisfied

---

## Module 4.3: PRD Generation & Editing

### 4.3.1 — Database: PRD Versions Table

**Files to create:**
- `apps/api/migrations/00026_create_prd_versions.sql`

**Schema:**
```sql
CREATE TABLE prd_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL, -- structured PRD content
  content_markdown TEXT NOT NULL, -- markdown version
  generated_by TEXT NOT NULL DEFAULT 'ai', -- 'ai', 'user'
  change_summary TEXT,
  parent_version_id UUID REFERENCES prd_versions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, version)
);

CREATE INDEX idx_prd_versions_project ON prd_versions(project_id);
```

**PRD content structure (JSONB):**
```json
{
  "title": "Employee Management System",
  "overview": { "problem": "...", "target_audience": "...", "goals": ["..."] },
  "personas": [
    { "role": "Admin", "needs": ["..."], "journeys": ["..."] }
  ],
  "features": [
    {
      "id": "feat-1",
      "title": "User Authentication",
      "description": "...",
      "user_story": "As a user, I want to...",
      "acceptance_criteria": ["..."],
      "priority": "high",
      "dependencies": []
    }
  ],
  "business_rules": ["..."],
  "functional_requirements": ["..."],
  "non_functional_requirements": ["..."],
  "security_requirements": ["..."],
  "integration_requirements": ["..."]
}
```

### 4.3.2 — PRD Agent

**Files to create:**
- `apps/ai/app/agents/prd_agent.py` — replace stub with full implementation
- `apps/ai/app/api/prd.py` — update with full endpoints

**PRD agent flow:**
```python
class PRDAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        # 1. Gather locked requirements
        requirements = await self.get_locked_requirements(context.project_id)
        
        # 2. Gather relevant knowledge base entries
        knowledge = await self.search_knowledge_base(context.project_id, "PRD generation")
        
        # 3. Generate structured PRD
        prd = await self.generate_prd(requirements, knowledge)
        
        # 4. Store PRD version
        version = await self.store_prd_version(context.project_id, prd)
        
        return AgentResult(prd_version=version, state_transition="prd_ready")
```

### 4.3.3 — PRD Editor (Next.js)

**Files to create:**
- `apps/web/app/projects/[projectId]/prd/page.tsx` — PRD editor page
- `apps/web/components/editor/prd-editor.tsx` — TipTap rich text editor
- `apps/web/components/editor/prd-toolbar.tsx` — editor toolbar
- `apps/web/components/editor/prd-sidebar.tsx` — section navigation
- `apps/web/components/editor/version-history.tsx` — version diff viewer
- `apps/web/components/editor/ai-edit-panel.tsx` — AI modification panel
- `apps/web/lib/prd.ts` — PRD API client

**PRD editor features:**
- TipTap editor with markdown support
- Section-by-section navigation sidebar
- AI edit panel: "Modify this section" → sends to AI → updates PRD
- Version history: view previous versions, compare diffs, restore
- Auto-save on changes (creates new version on significant edits)
- Export to PDF/Markdown

**PRD endpoints:**
```
GET  /api/v1/projects/:id/prd             — get current PRD
GET  /api/v1/projects/:id/prd/versions    — list PRD versions
GET  /api/v1/projects/:id/prd/versions/:v — get specific version
POST /api/v1/projects/:id/prd/ai-edit    — request AI modification
POST /api/v1/projects/:id/prd/approve    — approve PRD, transition state
```

---

## TypeScript Types & Schemas

**Files to create/modify:**
- `packages/types/src/requirement.ts` — update with full Requirement, ClarificationQuestion types
- `packages/types/src/prd.ts` — update with PRD, PRDVersion, PRDSection types
- `packages/types/src/agent.ts` — update with AgentRun, AgentEvent, AgentMessage types
- `packages/schemas/requirement.schema.json` — update
- `packages/schemas/prd.schema.json` — update

---

## OpenAPI Spec Updates

**Files to modify:**
- `apps/api/api-spec.yaml` — add agent run, requirement, PRD endpoints
- `apps/ai/api-spec.yaml` — add requirement analysis, PRD generation endpoints

---

## Verification Steps

1. **Requirement analysis:** Enter problem statement → agent extracts requirements with confidence scores
2. **Clarification loop:** Low-confidence requirements generate questions → user answers → requirements updated
3. **Requirement locking:** All requirements at ≥0.7 confidence → lock requirements
4. **PRD generation:** Locked requirements → PRD agent generates structured PRD
5. **PRD editing:** Open PRD in editor → edit sections → save as new version
6. **AI modification:** Request AI to modify section → PRD updated
7. **Version history:** View version list → compare versions → restore previous version
8. **State transitions:** Project state correctly transitions through: draft → analyzing → clarification → prd_ready
9. **SSE streaming:** Agent events stream to frontend in real-time

---

## Implementation Order

1. Database migrations (agent_runs, agent_messages, agent_events, requirements, prd_versions)
2. FastAPI orchestrator + base agent + state machine
3. FastAPI LLM provider (OpenAI)
4. FastAPI requirement agent
5. FastAPI PRD agent
6. Go agent run API + SSE streaming
7. Go requirement + PRD API endpoints
8. Next.js analysis UI (problem statement, trigger analysis, progress)
9. Next.js clarification UI (questions, answers, confidence display)
10. Next.js PRD editor (TipTap, versioning, AI edit)
11. TypeScript types + JSON schemas
12. OpenAPI spec updates
13. End-to-end verification
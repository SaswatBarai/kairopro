# Phase 7: AI Engine — Development & Execution — Implementation Plan

## Overview

Build the developer agent that generates code file-by-file based on approved architecture + PRD + design, and the testing/debugging loop that executes builds, captures errors, and iteratively fixes them. After this phase, KairoPro can generate a complete application, run tests, fix errors, and present a working preview.

**Key decisions:**
- Developer agent generates code file-by-file in topological order (DB → Backend → Frontend)
- Code is written to workspace container via Go API
- Test/debug loop: max 10 iterations, then request human intervention
- AI chat: users can request modifications via natural language
- All changes tracked as change sets with rollback capability

---

## Module 7.1: AI Development Planning & Coding

### 7.1.1 — Database: Tasks & Change Sets

**Files to create:**
- `apps/api/migrations/00031_create_tasks.sql`

**Schema:**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, planning, in_progress, blocked, testing, completed, failed
  priority TEXT NOT NULL DEFAULT 'medium', -- critical, high, medium, low
  task_type TEXT NOT NULL, -- 'database', 'backend', 'frontend', 'testing', 'deployment', 'configuration'
  dependencies UUID[] DEFAULT '{}', -- array of task IDs this depends on
  order_index INTEGER NOT NULL DEFAULT 0,
  agent_run_id UUID REFERENCES agent_runs(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on)
);

CREATE TABLE change_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES agent_runs(id),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, applied, rolled_back
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE file_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_set_id UUID NOT NULL REFERENCES change_sets(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'modified', 'deleted'
  file_path TEXT NOT NULL,
  content_before TEXT, -- previous content (for rollback)
  content_after TEXT, -- new content
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_change_sets_project ON change_sets(project_id);
CREATE INDEX idx_file_changes_change_set ON file_changes(change_set_id);
```

### 7.1.2 — Developer Agent

**Files to create:**
- `apps/ai/app/agents/developer_agent.py` — replace stub with full implementation
- `apps/ai/app/agents/task_planner.py` — task decomposition and ordering
- `apps/ai/app/agents/code_generator.py` — per-file code generation
- `apps/ai/app/api/code.py` — update with full endpoints

**Developer agent flow:**
```python
class DeveloperAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        # 1. Get approved architecture + PRD + design
        architecture = await self.get_architecture(context.project_id)
        prd = await self.get_prd(context.project_id)
        design = await self.get_design(context.project_id)
        
        # 2. Plan task graph
        task_graph = await self.plan_tasks(architecture, prd, design)
        
        # 3. Store tasks in DB
        await self.store_task_graph(context.project_id, task_graph)
        
        # 4. Execute tasks in topological order
        for task in task_graph.topological_order():
            await self.execute_task(context.project_id, task)
        
        return AgentResult(state_transition="testing")
    
    async def execute_task(self, project_id: str, task: Task):
        # 1. Generate code for this task
        files = await self.generate_code(task)
        
        # 2. Create change set
        change_set = await self.create_change_set(project_id, task.id, files)
        
        # 3. Apply changes to workspace
        await self.apply_changes(project_id, change_set)
        
        # 4. Emit events
        await self.emit_event(task.agent_run_id, "file.created", {...})
```

**Task planner:**
```python
class TaskPlanner:
    async def plan_tasks(self, architecture, prd, design) -> TaskGraph:
        """Decompose architecture into ordered tasks."""
        # LLM generates task list based on architecture
        # Tasks ordered: DB schema → Backend APIs → Frontend pages
        # Dependencies tracked for parallel execution where possible
        pass
```

**Code generation strategy:**
- LLM receives: task description + architecture + relevant PRD sections + design tokens
- LLM generates complete file content (not snippets)
- Each file is a separate generation call for reliability
- Generated code includes: proper imports, error handling, type annotations
- Code is written to workspace container via Go API

**Task ordering (topological):**
```
FOUNDATION
├── Project setup (package.json, configs)
├── Database schema (migrations)
└── Authentication (middleware, routes)

CORE
├── Backend APIs (CRUD endpoints)
├── Frontend pages (routes, components)
└── Integration (API client, state management)

TESTING
├── Unit tests
├── API tests
└── E2E tests
```

### 7.1.3 — AI Chat Interface

**Files to create:**
- `apps/web/app/projects/[projectId]/code/page.tsx` — update with AI chat panel
- `apps/web/components/ai-chat/chat-panel.tsx` — AI chat sidebar
- `apps/web/components/ai-chat/chat-message.tsx` — individual message component
- `apps/web/components/ai-chat/chat-input.tsx` — message input with file attachment
- `apps/web/components/ai-chat/plan-display.tsx` — shows AI plan before execution
- `apps/web/lib/ai-chat.ts` — AI chat API client

**AI chat features:**
- User can type natural language requests ("Add forgot-password functionality")
- AI responds with a plan: list of files to create/modify
- User can approve or modify the plan
- AI executes the plan, streaming progress events
- Chat history persisted per project
- Context includes current project state, files, and previous changes

**Chat endpoints:**
```
POST /api/v1/projects/:id/chat           — send message to AI
GET  /api/v1/projects/:id/chat/history    — get chat history
POST /api/v1/projects/:id/chat/approve   — approve AI plan
POST /api/v1/projects/:id/chat/reject     — reject AI plan
```

**Database:**
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_project ON chat_messages(project_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);
```

Migration: `apps/api/migrations/00032_create_chat_messages.sql`

### 7.1.4 — Development Stream UI

**Files to create:**
- `apps/web/components/ai/activity-stream.tsx` — real-time activity feed
- `apps/web/components/ai/task-list.tsx` — task progress list
- `apps/web/components/ai/change-set-viewer.tsx` — file diff viewer

**Activity stream shows:**
```
✓ Analyzed authentication module
✓ Created password reset schema
✓ Added API endpoint
✓ Created reset password page
⟳ Running tests
✗ 2 tests failed
⟳ Fixing validation issue
✓ Tests passing
```

**Task list shows:**
- Current task with progress bar
- Completed tasks with checkmarks
- Pending/blocked tasks
- Failed tasks with error details

**Change set viewer:**
- Side-by-side diff of each file change
- Option to approve or reject individual changes
- Rollback button for each change set

---

## Module 7.2: AI Testing & Debugging Loop

### 7.2.1 — Test & Debug Agents

**Files to create:**
- `apps/ai/app/agents/testing_agent.py` — test execution agent
- `apps/ai/app/agents/debugging_agent.py` — error analysis and fix agent
- `apps/ai/app/api/testing.py` — test execution endpoints

**Testing agent:**
```python
class TestingAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        # 1. Get list of test commands from architecture
        test_commands = await self.get_test_commands(context.project_id)
        
        # 2. Execute each test command in workspace
        results = []
        for cmd in test_commands:
            result = await self.execute_in_workspace(context.project_id, cmd)
            results.append(result)
            await self.emit_event(context.run_id, "test.started" / "test.passed" / "test.failed", {...})
        
        # 3. If all pass, transition to preview
        # 4. If any fail, trigger debugging agent
        if all(r.passed for r in results):
            return AgentResult(state_transition="preview")
        else:
            return AgentResult(state_transition="debugging", failures=results)
```

**Debugging agent:**
```python
class DebuggingAgent(BaseAgent):
    MAX_ITERATIONS = 10
    
    async def run(self, context: AgentContext) -> AgentResult:
        for iteration in range(self.MAX_ITERATIONS):
            # 1. Get error output from failed test/build
            errors = await self.get_errors(context.project_id)
            
            # 2. Analyze errors and identify root cause
            analysis = await self.analyze_errors(errors)
            
            # 3. Generate fix
            fix = await self.generate_fix(analysis)
            
            # 4. Apply fix to workspace
            await self.apply_fix(context.project_id, fix)
            
            # 5. Re-run tests
            test_result = await self.run_tests(context.project_id)
            
            if test_result.all_passed:
                return AgentResult(state_transition="preview")
            
            await self.emit_event(context.run_id, "debug.iteration", {
                "iteration": iteration + 1,
                "error": errors[0].message,
                "fix": fix.description
            })
        
        # Max iterations reached — request human intervention
        return AgentResult(state_transition="failed", 
                          message="Max debug iterations reached. Manual intervention required.")
```

### 7.2.2 — Build & Test Execution

**Files to create:**
- `apps/api/internal/sandbox/build_service.go` — update with full build orchestration
- `apps/api/internal/sandbox/test_service.go` — test execution service

**Build flow:**
1. AI triggers build via `POST /api/v1/projects/:id/build`
2. Go executes build command in container (e.g., `npm run build && go build ./...`)
3. Go streams stdout/stderr via SSE
4. Build status updated in `builds` table
5. On success: preview available; on failure: logs available for debugging

**Test flow:**
1. AI triggers tests via `POST /api/v1/projects/:id/test`
2. Go executes test command in container (e.g., `npm test`, `go test ./...`, `pytest`)
3. Go parses test output for pass/fail counts
4. Test results stored in `test_runs` table
5. On failure: error details passed to debugging agent

**Database:**
```sql
CREATE TABLE test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  build_id UUID REFERENCES builds(id),
  agent_run_id UUID REFERENCES agent_runs(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, passed, failed
  total_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  output TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_test_runs_project ON test_runs(project_id);
```

Migration: `apps/api/migrations/00033_create_test_runs.sql`

**Build & test endpoints:**
```
POST /api/v1/projects/:id/build          — trigger build
GET  /api/v1/projects/:id/build/status   — get build status
GET  /api/v1/projects/:id/build/logs      — stream build logs (SSE)

POST /api/v1/projects/:id/test           — trigger tests
GET  /api/v1/projects/:id/test/status    — get test status
GET  /api/v1/projects/:id/test/results    — get test results
```

### 7.2.3 — Rollback System

**Files to create:**
- `apps/api/internal/sandbox/rollback_service.go` — change set rollback logic

**Rollback flow:**
1. Each AI change creates a `change_set` with `file_changes`
2. `file_changes` stores `content_before` and `content_after` for each file
3. Rollback: iterate file changes in reverse, restore `content_before`
4. User can rollback individual change sets or entire agent runs

**Rollback endpoints:**
```
POST /api/v1/projects/:id/change-sets/:id/rollback — rollback a change set
GET  /api/v1/projects/:id/change-sets              — list change sets
GET  /api/v1/projects/:id/change-sets/:id           — get change set details
```

---

## TypeScript Types & Schemas

**Files to create/modify:**
- `packages/types/src/task.ts` — update with Task, TaskDependency, TaskGraph types
- `packages/types/src/agent.ts` — update with ChangeSet, FileChange types
- `packages/types/src/chat.ts` — ChatMessage types
- `packages/schemas/task.schema.json` — update
- `packages/schemas/agent-event.schema.json` — update with dev/test/debug events

---

## OpenAPI Spec Updates

**Files to modify:**
- `apps/api/api-spec.yaml` — add task, change set, chat, build, test, rollback endpoints
- `apps/ai/api-spec.yaml` — add code generation, testing, debugging endpoints

---

## Verification Steps

1. **Task planning:** After architecture approval → developer agent creates task graph
2. **Code generation:** Tasks execute in order → files written to workspace container
3. **AI chat:** User requests modification → AI plans changes → user approves → changes applied
4. **Build execution:** Trigger build → build runs in container → logs stream back
5. **Test execution:** Trigger tests → tests run in container → results reported
6. **Debug loop:** Tests fail → debugging agent analyzes → fixes code → re-runs tests
7. **Max iterations:** After 10 failed debug iterations → human intervention requested
8. **Change sets:** Each AI change tracked → viewable as diff → rollbackable
9. **Rollback:** Rollback change set → files restored to previous state
10. **Activity stream:** Real-time events showing progress (file created, test passed, etc.)
11. **Live preview:** After successful build → preview URL shows running application

---

## Implementation Order

1. Database migrations (tasks, task_dependencies, change_sets, file_changes, chat_messages, test_runs)
2. FastAPI task planner + developer agent
3. FastAPI testing agent + debugging agent
4. Go task + change set + chat API endpoints
5. Go build & test execution services
6. Go rollback service
7. Next.js AI chat interface
8. Next.js development stream (activity feed, task list)
9. Next.js change set viewer (diff view, rollback)
10. TypeScript types + JSON schemas
11. OpenAPI spec updates
12. End-to-end verification
# Phase 7: AI Engine — Development & Execution — Implementation Plan

## Overview

Build the developer agent that generates code file-by-file based on approved architecture + PRD + design, and the testing/debugging loop. After this phase, KairoPro can generate a complete application, run tests, fix errors, and show a working preview.

**Key decisions:**
- Developer agent (FastAPI) generates code and calls Next.js sandbox API to write files / run commands
- FastAPI agents are completely stateless — all state in PostgreSQL via Prisma
- Test/debug loop: max 10 iterations, then request human intervention
- All chat and task triggers: Browser → Next.js API routes → FastAPI

---

## Module 7.1: AI Development Planning & Coding

### 7.1.1 — Prisma Schema: Tasks & Change Sets

**File to update:** `apps/web/prisma/schema.prisma`

```prisma
model Task {
  id           String    @id @default(cuid())
  projectId    String
  title        String
  description  String?
  status       String    @default("pending") // pending, planning, in_progress, blocked, testing, completed, failed
  priority     String    @default("medium")
  taskType     String    // database, backend, frontend, testing, deployment, configuration
  orderIndex   Int       @default(0)
  agentRunId   String?
  startedAt    DateTime?
  completedAt  DateTime?
  project      Project   @relation(fields: [projectId], references: [id])
  dependencies TaskDependency[] @relation("DependentTask")
  dependents   TaskDependency[] @relation("DependsOnTask")
  changeSets   ChangeSet[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model TaskDependency {
  id          String @id @default(cuid())
  taskId      String
  dependsOnId String
  task        Task   @relation("DependentTask", fields: [taskId], references: [id])
  dependsOn   Task   @relation("DependsOnTask", fields: [dependsOnId], references: [id])

  @@unique([taskId, dependsOnId])
}

model ChangeSet {
  id          String       @id @default(cuid())
  projectId   String
  taskId      String
  agentRunId  String?
  description String
  status      String       @default("applied") // applied, rolled_back
  task        Task         @relation(fields: [taskId], references: [id])
  fileChanges FileChange[]
  createdAt   DateTime     @default(now())
}

model FileChange {
  id            String    @id @default(cuid())
  changeSetId   String
  action        String    // created, modified, deleted
  filePath      String
  contentBefore String?
  contentAfter  String?
  changeSet     ChangeSet @relation(fields: [changeSetId], references: [id], onDelete: Cascade)
  createdAt     DateTime  @default(now())
}

model ChatMessage {
  id        String   @id @default(cuid())
  projectId String
  userId    String?
  role      String   // user, assistant, system
  content   String
  metadata  Json     @default("{}")
  project   Project  @relation(fields: [projectId], references: [id])
  createdAt DateTime @default(now())
}
```

Run: `prisma migrate dev --name add-tasks-changesets-chat`

### 7.1.2 — FastAPI Developer Agent

**Files to create:**
- `apps/ai/app/agents/developer_agent.py` — full implementation
- `apps/ai/app/agents/task_planner.py` — task decomposition
- `apps/ai/app/agents/code_generator.py` — per-file code generation
- `apps/ai/app/api/code.py` — endpoints

```python
class DeveloperAgent(BaseAgent):
    def __init__(self, llm: LLMProvider, platform_client: PlatformClient):
        super().__init__(llm)
        # PlatformClient makes HTTP calls back to Next.js API routes
        self.platform = platform_client

    async def run(self, context: AgentContext) -> AgentResult:
        architecture = context.architecture
        prd = context.prd
        design = context.design

        # 1. Plan task graph
        task_graph = await self.plan_tasks(architecture, prd, design)
        await self.platform.store_tasks(context.project_id, task_graph)
        await self.emit_event(context.run_id, "agent.thinking", {"step": "task graph planned"})

        # 2. Execute in topological order
        for task in task_graph.topological_order():
            await self.emit_event(context.run_id, "file.created", {"task": task.title})
            files = await self.generate_code(task, architecture, design)
            change_set = await self.platform.create_change_set(context.project_id, task.id, files)
            # Write files to sandbox via Next.js API route
            await self.platform.write_files(context.project_id, files)

        return AgentResult(stateTransition="testing")
```

**PlatformClient (FastAPI → Next.js API):**
```python
class PlatformClient:
    """Calls Next.js API routes to perform sandbox operations."""

    def __init__(self, base_url: str, service_token: str):
        self.base_url = base_url
        self.headers = {"X-Service-Token": service_token}

    async def write_files(self, project_id: str, files: list[FileChange]) -> None:
        for file in files:
            await self._put(f"/api/projects/{project_id}/workspace/files",
                           {"path": file.path, "content": file.content})

    async def exec_command(self, project_id: str, command: list[str]) -> ExecResult:
        return await self._post(f"/api/projects/{project_id}/sandbox/exec", {"command": command})

    async def store_tasks(self, project_id: str, tasks: list[Task]) -> None:
        return await self._post(f"/api/projects/{project_id}/tasks/batch", {"tasks": tasks})
```

**Task ordering:**
```
FOUNDATION: project setup, Prisma schema, migrations
BACKEND: NextAuth, API routes (CRUD endpoints)
FRONTEND: layout, pages, components, API client
TESTING: unit tests, API tests, E2E tests
```

**FastAPI code endpoints (internal):**
```
POST /ai/plan   — generate task graph
POST /ai/code   — generate code for a specific task/file
POST /ai/chat   — respond to user chat message with a plan
```

### 7.1.3 — Next.js Task & Chat API Routes

**`apps/web/app/api/projects/[id]/tasks/route.ts`**
- `GET` — list tasks with status
- `POST` — trigger developer agent (enqueue BullMQ job)

**`apps/web/app/api/projects/[id]/tasks/batch/route.ts`**
- `POST` — bulk-create tasks (called by FastAPI agent via PlatformClient)

**`apps/web/app/api/projects/[id]/tasks/[taskId]/route.ts`**
- `PATCH` — update task status

**`apps/web/app/api/projects/[id]/chat/route.ts`**
- `GET` — list chat history
- `POST` — send message → enqueue FastAPI chat job

**`apps/web/app/api/projects/[id]/change-sets/route.ts`**
- `GET` — list change sets (with file diffs)

**`apps/web/app/api/projects/[id]/change-sets/[csId]/rollback/route.ts`**
- `POST` — rollback change set: restore `contentBefore` for each `FileChange`

```typescript
// POST /api/projects/:id/change-sets/:csId/rollback
export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const changeSet = await db.changeSet.findUnique({
    where: { id: params.csId },
    include: { fileChanges: true }
  })

  const workspace = await db.workspace.findUnique({ where: { projectId: params.id } })

  // Restore each file in reverse order
  for (const fc of changeSet!.fileChanges.reverse()) {
    if (fc.contentBefore) {
      await writeFile(workspace!.containerId!, fc.filePath, fc.contentBefore)
    }
  }

  await db.changeSet.update({ where: { id: params.csId }, data: { status: 'rolled_back' } })
  return Response.json({ success: true })
}
```

### 7.1.4 — Development Stream & Chat UI

**Files to create:**
- `apps/web/components/ai/activity-stream.tsx` — real-time agent activity feed (SSE)
- `apps/web/components/ai/task-list.tsx` — task progress tracker
- `apps/web/components/ai/change-set-viewer.tsx` — file diff viewer + rollback
- `apps/web/components/ai-chat/chat-panel.tsx` — AI chat sidebar
- `apps/web/components/ai-chat/chat-message.tsx`
- `apps/web/components/ai-chat/plan-display.tsx` — shows plan before execution

---

## Module 7.2: AI Testing & Debugging Loop

### 7.2.1 — FastAPI Testing & Debugging Agents

**Files to create:**
- `apps/ai/app/agents/testing_agent.py`
- `apps/ai/app/agents/debug_agent.py`

```python
class TestingAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        test_commands = self.get_test_commands(context.architecture)
        results = []
        for cmd in test_commands:
            await self.emit_event(context.run_id, "test.started", {"command": cmd})
            result = await self.platform.exec_command(context.project_id, cmd.split())
            passed = result.exit_code == 0
            event = "test.passed" if passed else "test.failed"
            await self.emit_event(context.run_id, event, {"output": result.stdout})
            results.append(result)

        if all(r.exit_code == 0 for r in results):
            return AgentResult(stateTransition="preview")
        return AgentResult(stateTransition="debugging", failures=results)

class DebuggingAgent(BaseAgent):
    MAX_ITERATIONS = 10

    async def run(self, context: AgentContext) -> AgentResult:
        for i in range(self.MAX_ITERATIONS):
            errors = context.test_failures

            # Analyze error and produce fix
            fix = await self.llm.complete(
                system=DEBUG_PROMPT,
                user=f"Error:\n{errors}\nRelevant files: {context.relevant_files}",
                response_model=list[FileChange],
            )

            # Apply fix via Next.js API
            await self.platform.write_files(context.project_id, fix)
            await self.emit_event(context.run_id, "debug.iteration", {"attempt": i+1})

            # Re-run tests
            result = await self.platform.exec_command(context.project_id, ["npm", "test"])
            if result.exit_code == 0:
                return AgentResult(stateTransition="preview")

        return AgentResult(
            stateTransition="failed",
            message="Max debug iterations reached. Manual intervention required."
        )
```

### 7.2.2 — Next.js Build & Test API Routes

**`apps/web/app/api/projects/[id]/build/route.ts`**
- `POST` — run `npm run build` in sandbox, stream logs, create Build record

**`apps/web/app/api/projects/[id]/test/route.ts`**
- `POST` — run `npm test` in sandbox, create TestRun record

**`apps/web/app/api/projects/[id]/test/results/route.ts`**
- `GET` — get latest TestRun results

These routes are called both by users (manually) and by FastAPI agents via PlatformClient.

---

## Verification Steps

1. Task planning: After architecture approval → developer agent creates task graph → tasks visible in UI
2. Code generation: Tasks execute → files written to sandbox container via Next.js API
3. AI chat: "Add forgot-password" → FastAPI returns plan → user approves → changes applied
4. Build: `POST .../build` → `npm run build` in container → logs stream back
5. Tests: `POST .../test` → test runner executes → pass/fail reported
6. Debug loop: Tests fail → debugging agent fixes → re-runs → pass (or max iterations reached)
7. Change sets: Each AI change tracked → viewable as diff → rollback via `POST .../rollback`
8. Activity stream: Real-time SSE events (file.created, test.passed, debug.iteration)
9. Live preview: After build passes → preview URL shows running app

---

## Implementation Order

1. Prisma schema (Task, TaskDependency, ChangeSet, FileChange, ChatMessage) + migrate
2. FastAPI PlatformClient (HTTP client calling Next.js sandbox API)
3. FastAPI task planner + developer agent
4. FastAPI testing agent + debug agent
5. BullMQ development worker (Next.js side, calls FastAPI)
6. Next.js task API routes (list, batch-create, update status)
7. Next.js chat API routes (history, send)
8. Next.js change set API routes (list, rollback)
9. Next.js build + test API routes (exec + streaming)
10. Next.js AI chat UI
11. Next.js development activity stream UI
12. Next.js change set diff viewer + rollback UI
13. TypeScript types
14. End-to-end verification
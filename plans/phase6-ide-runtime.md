# Phase 6: KairoPro IDE & Runtime — Implementation Plan

## Overview

Build the browser-based IDE (Monaco editor + file tree + terminal), workspace sandboxing (Docker containers managed by **Next.js API routes**), and live preview proxy. After this phase, users have a Replit-like IDE where they can view files, see terminal output, and preview running applications.

**Key decisions:**
- Code editor: Monaco Editor
- Terminal: Xterm.js connected via WebSocket to Next.js API route
- Sandbox: Docker containers per project, managed by **Next.js API routes** using `dockerode`
- Preview: Next.js middleware reverse proxy → sandbox container port
- File sync: Next.js API reads/writes files in container volumes via `dockerode`
- **No Go service** — all sandbox control is in `apps/web/lib/docker.ts` + API routes

---

## Module 6.1: Web IDE UI

### 6.1.1 — Prisma Schema: Workspaces & Builds

**File to update:** `apps/web/prisma/schema.prisma`

```prisma
model Workspace {
  id           String    @id @default(cuid())
  projectId    String    @unique
  containerId  String?   // Docker container ID
  status       String    @default("stopped") // starting, running, stopped, error
  port         Int?      // assigned preview port
  dockerImage  String?
  project      Project   @relation(fields: [projectId], references: [id])
  files        WorkspaceFile[]
  builds       Build[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model WorkspaceFile {
  id          String    @id @default(cuid())
  projectId   String
  workspaceId String
  path        String    // relative path within workspace
  content     String?
  isDirectory Boolean   @default(false)
  lastModified DateTime  @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id])

  @@unique([workspaceId, path])
}

model Build {
  id           String    @id @default(cuid())
  projectId    String
  workspaceId  String
  status       String    @default("pending") // pending, running, success, failed
  buildCommand String
  logs         String?
  startedAt    DateTime?
  completedAt  DateTime?
  workspace    Workspace @relation(fields: [workspaceId], references: [id])
  testRuns     TestRun[]
  createdAt    DateTime  @default(now())
}

model TestRun {
  id           String    @id @default(cuid())
  projectId    String
  buildId      String?
  agentRunId   String?
  status       String    @default("pending") // pending, running, passed, failed
  totalTests   Int       @default(0)
  passedTests  Int       @default(0)
  failedTests  Int       @default(0)
  output       String?
  startedAt    DateTime?
  completedAt  DateTime?
  build        Build?    @relation(fields: [buildId], references: [id])
  createdAt    DateTime  @default(now())
}
```

Run: `prisma migrate dev --name add-workspace-build`

### 6.1.2 — Monaco Editor & File Tree

**Files to create:**
- `apps/web/app/projects/[projectId]/code/page.tsx` — IDE page
- `apps/web/components/editor/ide-layout.tsx` — 3-column layout
- `apps/web/components/editor/file-tree.tsx` — file navigation
- `apps/web/components/editor/monaco-editor.tsx` — Monaco wrapper
- `apps/web/components/editor/editor-tabs.tsx` — open file tabs
- `apps/web/lib/workspace.ts` — workspace API client

**IDE layout:**
```
┌────────────┬──────────────────────┬────────────────┐
│ File Tree  │ Monaco Code Editor   │ Live Preview   │
│            │                      │                │
│ app/       │ app/page.tsx         │   Running App  │
│ api/       │                      │                │
│ prisma/    │                      │                │
├────────────┴──────────────────────┴────────────────┤
│ Terminal (Xterm.js) / AI Activity / Logs            │
└─────────────────────────────────────────────────────┘
```

**Monaco features:** Syntax highlighting (TS, Python, SQL, JSON, YAML), multi-tab, file search (Ctrl+P), read-only mode with edit toggle, diff view for AI changes.

**Workspace file API routes:**
```
GET    /api/projects/:id/workspace/files         — file tree
GET    /api/projects/:id/workspace/files?path=.. — file content
PUT    /api/projects/:id/workspace/files?path=.. — update content
POST   /api/projects/:id/workspace/files         — create file/dir
DELETE /api/projects/:id/workspace/files?path=.. — delete
```

### 6.1.3 — Terminal & WebSocket

**Files to create:**
- `apps/web/components/terminal/xterm-terminal.tsx` — Xterm.js wrapper
- `apps/web/components/terminal/terminal-tabs.tsx`
- `apps/web/lib/websocket.ts` — WebSocket client

**WebSocket terminal route:**
- `apps/web/app/api/projects/[id]/terminal/route.ts`

```typescript
// Next.js App Router WebSocket (via custom server or Next.js 14 WebSocket support)
export async function GET(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req)  // or ws library with custom server
  const workspace = await db.workspace.findUnique({ where: { projectId: params.id } })

  socket.onopen = async () => {
    const exec = await docker.getContainer(workspace.containerId).exec({
      Cmd: ['/bin/sh'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true
    })
    // Pipe exec stream ↔ WebSocket
  }
  return response
}
```

> Note: Next.js App Router WebSocket support is via a custom `server.ts` (using `ws` library) for local dev, or via a dedicated WebSocket handler in production.

---

## Module 6.2: Sandbox Management (Next.js + dockerode)

### 6.2.1 — Docker Client Library

**File:** `apps/web/lib/docker.ts`

```typescript
import Docker from 'dockerode'

export const docker = new Docker({ socketPath: '/var/run/docker.sock' })

export const SANDBOX_CONFIG = {
  Image: 'kairopro/sandbox:latest',
  CpuPeriod: 100000,
  CpuQuota: 200000,   // 2 vCPU max
  Memory: 2 * 1024 * 1024 * 1024,  // 2 GB
  NetworkMode: 'bridge',
}

export async function createSandbox(projectId: string): Promise<string> {
  const container = await docker.createContainer({
    ...SANDBOX_CONFIG,
    name: `kairopro-${projectId}`,
    Volumes: { [`/workspace`]: {} },
    HostConfig: {
      Binds: [`kairopro-vol-${projectId}:/workspace`],
      Memory: SANDBOX_CONFIG.Memory,
    },
  })
  await container.start()
  return container.id
}

export async function execInSandbox(containerId: string, cmd: string[]): Promise<{ stdout: string; stderr: string }> {
  const container = docker.getContainer(containerId)
  const exec = await container.exec({ Cmd: cmd, AttachStdout: true, AttachStderr: true })
  const stream = await exec.start({})
  // demux stdout/stderr and return
}

export async function writeFile(containerId: string, path: string, content: string): Promise<void> {
  // Use docker cp via tar stream
}

export async function readFile(containerId: string, path: string): Promise<string> {
  // Use exec cat
}

export async function listFiles(containerId: string, dir: string = '/workspace'): Promise<FileNode[]> {
  // Use exec find
}
```

### 6.2.2 — Sandbox API Routes

**Files to create:**

**`apps/web/app/api/projects/[id]/sandbox/route.ts`**
- `POST` — create + start sandbox container
- `DELETE` — stop + remove container

**`apps/web/app/api/projects/[id]/sandbox/status/route.ts`**
- `GET` — return workspace status

**`apps/web/app/api/projects/[id]/sandbox/exec/route.ts`**
- `POST` — execute command in container, stream stdout/stderr via SSE

```typescript
// POST /api/projects/:id/sandbox/exec
export async function POST(req: Request, { params }: Params) {
  const { command } = await req.json()
  const workspace = await db.workspace.findUnique({ where: { projectId: params.id } })

  const stream = new ReadableStream({
    async start(controller) {
      const { stdout, stderr } = await execInSandbox(workspace.containerId!, command)
      // Stream output
      controller.enqueue(`data: ${JSON.stringify({ type: 'stdout', data: stdout })}\n\n`)
      controller.close()
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  })
}
```

**FastAPI agents call this endpoint** to run commands, tests, builds — they do not have direct Docker access.

### 6.2.3 — Sandbox Dockerfile

**File:** `infrastructure/docker/sandbox/Dockerfile`

```dockerfile
FROM node:20-slim

# Install Python, git, common tools
RUN apt-get update && apt-get install -y \
    python3 python3-pip git curl build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

CMD ["/bin/sh", "-c", "tail -f /dev/null"]
```

### 6.2.4 — Workspace File API Routes

**`apps/web/app/api/projects/[id]/workspace/files/route.ts`**
```typescript
// GET — list file tree
// POST — create file or directory
export async function GET(req: Request, { params }: Params) {
  const workspace = await db.workspace.findUnique({ where: { projectId: params.id } })
  if (!workspace?.containerId) return Response.json({ files: [] })

  const files = await listFiles(workspace.containerId)
  return Response.json({ files })
}

export async function PUT(req: Request, { params }: Params) {
  const { path: filePath, content } = await req.json()
  const workspace = await db.workspace.findUnique({ where: { projectId: params.id } })
  await writeFile(workspace.containerId!, filePath, content)
  return Response.json({ success: true })
}
```

---

## Module 6.3: Build & Preview Systems

### 6.3.1 — Live Preview Proxy

**File:** `apps/web/middleware.ts` (update)

```typescript
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const previewMatch = host.match(/^([a-z0-9]+)\.preview\.kairopro\.in$/)

  if (previewMatch) {
    const projectId = previewMatch[1]
    // Look up container port from Redis/DB (cached)
    // Rewrite to container: http://localhost:{port}/...
    return NextResponse.rewrite(new URL(`http://localhost:${containerPort}${req.nextUrl.pathname}`))
  }

  return NextResponse.next()
}
```

Preview URL pattern:
- Local: `http://localhost:3000/api/projects/{id}/preview/`
- Production: `https://{id}.preview.kairopro.in`

### 6.3.2 — Build System

**`apps/web/app/api/projects/[id]/build/route.ts`**
- `POST` — trigger build in sandbox, create `Build` record, stream logs via SSE

```typescript
export async function POST(req: Request, { params }: Params) {
  const workspace = await db.workspace.findUnique({ where: { projectId: params.id } })
  const build = await db.build.create({
    data: { projectId: params.id, workspaceId: workspace!.id, buildCommand: 'npm run build', status: 'running' }
  })

  const stream = new ReadableStream({
    async start(controller) {
      const { stdout, stderr } = await execInSandbox(workspace!.containerId!, ['npm', 'run', 'build'])
      controller.enqueue(`data: ${stdout}\n\n`)

      const status = stderr ? 'failed' : 'success'
      await db.build.update({ where: { id: build.id }, data: { status, logs: stdout + stderr, completedAt: new Date() } })
      controller.close()
    }
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}
```

**`apps/web/app/api/projects/[id]/test/route.ts`**
- `POST` — run tests in sandbox, create `TestRun` record

---

## Verification Steps

1. `POST /api/projects/:id/sandbox` → Docker container created → `status = running`
2. `GET /api/projects/:id/workspace/files` → file tree from container returned
3. `PUT /api/projects/:id/workspace/files` → file written to container
4. WebSocket terminal → interactive shell in container
5. `POST /api/projects/:id/sandbox/exec { command: ["npm", "install"] }` → output streams via SSE
6. Preview URL → proxied to container app (200 OK)
7. `POST /api/projects/:id/build` → build runs → logs stream back → Build record updated

---

## Docker Compose Updates

Add Docker socket volume mount so Next.js can control containers:
```yaml
web:
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
```

Add sandbox base image build:
```yaml
sandbox-builder:
  build: ./infrastructure/docker/sandbox
  image: kairopro/sandbox:latest
```

---

## Implementation Order

1. Prisma schema (Workspace, WorkspaceFile, Build, TestRun) + migrate
2. `apps/web/lib/docker.ts` — dockerode client + helpers (createSandbox, exec, read/write file, list files)
3. Sandbox Dockerfile (`infrastructure/docker/sandbox/`)
4. Next.js sandbox API routes (start, stop, exec/SSE)
5. Next.js workspace file API routes (list, get, put, delete)
6. Next.js WebSocket terminal route (custom server or ws library)
7. Next.js build + test API routes
8. Next.js middleware preview proxy
9. Next.js IDE page layout (3-column)
10. Monaco Editor integration
11. File tree component
12. Xterm.js terminal component
13. Docker Compose updates (socket mount, sandbox image)
14. End-to-end verification
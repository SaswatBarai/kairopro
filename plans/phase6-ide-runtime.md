# Phase 6: KairoPro IDE & Runtime — Implementation Plan

## Overview

Build the browser-based IDE (Monaco editor + file tree + terminal), workspace sandboxing (Docker containers managed by Go), and live preview proxy. After this phase, users have a Replit-like IDE where they can view files, see terminal output, and preview running applications.

**Key decisions:**
- Code editor: Monaco Editor (VS Code's editor core)
- Terminal: Xterm.js connected via WebSocket to container shell
- Sandbox: Docker containers per project, managed by Go Docker SDK
- Preview: Go reverse proxy routing to container ports
- File sync: Go API reads/writes files in container volumes

---

## Module 6.1: Web IDE UI

### 6.1.1 — Database: Workspaces & Files Tables

**Files to create:**
- `apps/api/migrations/00029_create_workspaces.sql`

**Schema:**
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  container_id TEXT, -- Docker container ID
  status TEXT NOT NULL DEFAULT 'stopped', -- starting, running, stopped, error
  port INTEGER, -- assigned preview port
  docker_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  path TEXT NOT NULL, -- relative path within workspace
  content TEXT, -- file content (for small files)
  is_directory BOOLEAN NOT NULL DEFAULT FALSE,
  last_modified TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, path)
);

CREATE INDEX idx_workspaces_project ON workspaces(project_id);
CREATE INDEX idx_workspace_files_workspace ON workspace_files(workspace_id);
CREATE INDEX idx_workspace_files_path ON workspace_files(path);
```

### 6.1.2 — Monaco Editor & File Tree

**Files to create:**
- `apps/web/app/projects/[projectId]/code/page.tsx` — IDE page layout
- `apps/web/components/editor/ide-layout.tsx` — main IDE layout (sidebar + editor + preview)
- `apps/web/components/editor/file-tree.tsx` — file navigation tree
- `apps/web/components/editor/monaco-editor.tsx` — Monaco editor wrapper
- `apps/web/components/editor/editor-tabs.tsx` — open file tabs
- `apps/web/components/editor/file-search.tsx` — Ctrl+P file search
- `apps/web/lib/workspace.ts` — workspace API client

**IDE layout:**
```
┌────────────┬──────────────────────┬───────────────┐
│ File Tree  │ Code Editor          │ Live Preview  │
│            │                      │               │
│ frontend/  │ app/page.tsx        │               │
│ backend/   │                      │   Application │
│ database/  │                      │               │
│ tests/     │                      │               │
├────────────┴──────────────────────┴───────────────┤
│ Terminal / Logs / AI Activity                     │
└───────────────────────────────────────────────────┘
```

**Monaco editor features:**
- Syntax highlighting for TS, Go, Python, SQL, YAML, JSON, Markdown
- Multiple open files via tabs
- File search (Ctrl+P)
- Read-only mode (default) with edit toggle
- Diff view (for AI changes)
- Auto-save on change (debounced)

**File tree features:**
- Expand/collapse directories
- File icons by type
- Right-click context menu (new file, new folder, rename, delete)
- Search within files
- Synced with workspace container

**Workspace file endpoints:**
```
GET    /api/v1/projects/:id/workspace/files          — list all files (tree structure)
GET    /api/v1/projects/:id/workspace/files?path=... — get file content
PUT    /api/v1/projects/:id/workspace/files?path=... — update file content
POST   /api/v1/projects/:id/workspace/files           — create file/directory
DELETE /api/v1/projects/:id/workspace/files?path=... — delete file/directory
```

### 6.1.3 — Terminal & Live Streaming

**Files to create:**
- `apps/web/components/terminal/xterm-terminal.tsx` — Xterm.js terminal component
- `apps/web/components/terminal/terminal-tabs.tsx` — multiple terminal tabs
- `apps/web/lib/websocket.ts` — WebSocket client for terminal + events

**Terminal features:**
- Xterm.js connected to container shell via WebSocket
- Multiple terminal tabs
- Terminal output streaming (build logs, test output)
- Copy/paste support
- Terminal resize sync

**Terminal WebSocket endpoints:**
```
WS /api/v1/projects/:id/terminal     — interactive shell
WS /api/v1/projects/:id/events       — SSE for agent events
```

**Go WebSocket handler:**
- `apps/api/internal/sandbox/terminal_handler.go` — WebSocket terminal handler
- `apps/api/internal/sandbox/exec.go` — Docker exec wrapper

---

## Module 6.2: Workspace & Sandboxing

### 6.2.1 — Go Docker Sandbox Controller

**Files to create:**
- `apps/api/internal/sandbox/handler.go` — replace stub with full implementation
- `apps/api/internal/sandbox/service.go` — sandbox business logic
- `apps/api/internal/sandbox/controller.go` — Docker container management
- `apps/api/internal/sandbox/exec.go` — Docker exec commands
- `apps/api/internal/sandbox/files.go` — file operations in container
- `apps/api/pkg/docker/client.go` — Docker SDK client wrapper
- `apps/api/pkg/docker/config.go` — Docker configuration

**Sandbox controller:**
```go
type SandboxController struct {
    dockerClient *docker.Client
    config       *DockerConfig
}

type DockerConfig struct {
    BaseImage       string
    CPULimit        float64  // CPU units (e.g., 2.0)
    MemoryLimitMB   int      // Memory in MB
    DiskLimitGB     int      // Disk quota in GB
    NetworkMode     string   // "bridge" or "host"
    TimeoutMinutes  int      // Max runtime
}

func (c *SandboxController) CreateWorkspace(ctx context.Context, projectID string) (*Workspace, error)
func (c *SandboxController) StartWorkspace(ctx context.Context, workspaceID string) error
func (c *SandboxController) StopWorkspace(ctx context.Context, workspaceID string) error
func (c *SandboxController) RemoveWorkspace(ctx context.Context, workspaceID string) error
func (c *SandboxController) ExecCommand(ctx context.Context, workspaceID string, cmd []string) (ExecResult, error)
func (c *SandboxController) CopyFiles(ctx context.Context, workspaceID string, files map[string]string) error
func (c *SandboxController) GetFile(ctx context.Context, workspaceID string, path string) (string, error)
func (c *SandboxController) StreamLogs(ctx context.Context, workspaceID string) (<-chan string, error)
```

**Sandbox resource limits:**
- CPU: 2 cores max
- Memory: 2GB max
- Disk: 5GB max
- Network: bridge mode (isolated)
- Timeout: 30 minutes idle, 2 hours active

**Workspace lifecycle:**
1. User opens project → Go creates Docker container
2. Container starts with base image (Node.js + Go + Python)
3. Project files synced to container volume
4. Container assigned a preview port (e.g., 8080 + offset)
5. User closes project → container stops after idle timeout
6. Container data persisted in Docker volume

**Sandbox endpoints:**
```
POST   /api/v1/projects/:id/workspace/start    — start workspace container
POST   /api/v1/projects/:id/workspace/stop     — stop workspace container
GET    /api/v1/projects/:id/workspace/status    — get workspace status
POST   /api/v1/projects/:id/workspace/exec     — execute command in container
GET    /api/v1/projects/:id/workspace/logs      — stream container logs
WS     /api/v1/projects/:id/workspace/terminal — interactive terminal
```

### 6.2.2 — Workspace File Sync

**Files to create:**
- `apps/api/internal/sandbox/files.go` — file read/write operations in container

**File sync strategy:**
- Initial sync: Copy all project files from MinIO to container volume on workspace start
- Read operations: Go reads files from container via `docker cp` or exec `cat`
- Write operations: Go writes files to container via `docker cp` or exec `tee`
- AI writes: When AI agent modifies files, Go copies them to container and updates DB
- Periodic sync: Container files synced back to MinIO on save

**Docker base image:**
- Custom image with Node.js 20, Go 1.22, Python 3.12, PostgreSQL client
- Pre-installed: git, curl, common build tools
- Published to local Docker registry or built from Dockerfile

**Files to create:**
- `infrastructure/docker/sandbox/Dockerfile` — sandbox base image
- `infrastructure/docker/sandbox/entrypoint.sh` — sandbox entrypoint script

---

## Module 6.3: Build & Preview Systems

### 6.3.1 — Live Preview Proxy

**Files to create:**
- `apps/api/internal/sandbox/proxy.go` — reverse proxy to container
- `apps/api/internal/sandbox/proxy_handler.go` — HTTP handler for preview routes

**Preview proxy:**
```go
func (h *ProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // Extract project ID from path
    // Look up workspace container and port
    // Proxy request to container
    // Example: /preview/abc123/* → http://container:3000/*
}
```

**Preview endpoints:**
```
GET /api/v1/projects/:id/preview/* — proxy to workspace container
```

**Preview URL pattern:**
- Local: `http://localhost:8080/api/v1/projects/{id}/preview/`
- Production: `https://{project-slug}.preview.kairopro.in`

**Hot reload:**
- When AI modifies code in container, the container's dev server auto-reloads
- Next.js dev server has built-in hot reload
- Go and Python services need manual restart (or file watcher)

### 6.3.2 — Build System (Stub)

**Files to create:**
- `apps/api/internal/sandbox/build_handler.go` — build trigger endpoints
- `apps/api/internal/sandbox/build_service.go` — build orchestration logic

**Build endpoints (stubs for Phase 6, full in Phase 7):**
```
POST /api/v1/projects/:id/build       — trigger build in workspace
GET  /api/v1/projects/:id/build/status — get build status
GET  /api/v1/projects/:id/build/logs   — stream build logs
```

**Build flow (basic):**
1. User or AI triggers build
2. Go executes build command in container (e.g., `npm run build`)
3. Go streams build logs via SSE
4. Build status stored in `builds` table
5. On success: preview available; on failure: logs available for debugging

**Database:**
```sql
CREATE TABLE builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, success, failed
  build_command TEXT NOT NULL,
  logs TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_builds_project ON builds(project_id);
CREATE INDEX idx_builds_status ON builds(status);
```

Migration file: `apps/api/migrations/00030_create_builds.sql`

---

## TypeScript Types & Schemas

**Files to create/modify:**
- `packages/types/src/workspace.ts` — Workspace, WorkspaceFile, Build types
- `packages/schemas/workspace.schema.json` — workspace file/build schemas

---

## OpenAPI Spec Updates

**Files to modify:**
- `apps/api/api-spec.yaml` — add workspace, file, terminal, preview, build endpoints

---

## Docker Compose Updates

**Files to modify:**
- `docker-compose.yml` — add Docker socket volume mount for Go API
- `infrastructure/docker/sandbox/Dockerfile` — sandbox base image

---

## Verification Steps

1. **Workspace start:** POST `/workspace/start` → Docker container created → status `running`
2. **File tree:** GET `/workspace/files` → returns file tree from container
3. **File read/write:** GET/PUT `/workspace/files?path=app/page.tsx` → read/write works
4. **Terminal:** WebSocket connection → interactive shell in container
5. **Live preview:** GET `/preview/{id}/` → proxies to container's running app
6. **Build:** POST `/build` → build runs in container → logs stream back
7. **Resource limits:** Container respects CPU/memory/disk limits
8. **Cleanup:** Stop workspace → container stops → restart resumes state

---

## Implementation Order

1. Database migrations (workspaces, workspace_files, builds)
2. Go Docker SDK client + sandbox controller
3. Go workspace API (start, stop, status, exec, files)
4. Go terminal WebSocket handler
5. Go preview proxy
6. Go build system (basic)
7. Sandbox Dockerfile
8. Next.js IDE layout (file tree + editor + preview + terminal)
9. Monaco editor integration
10. Xterm.js terminal integration
11. File tree + file operations
12. TypeScript types + schemas
13. OpenAPI spec updates
14. Docker Compose updates
15. End-to-end verification
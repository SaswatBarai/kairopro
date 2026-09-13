"use client";

import { useState } from "react";
import {
  ArrowDownUp,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Code2,
  Eye,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  FolderTree,
  GitFork,
  History,
  ListCollapse,
  ListPlus,
  Loader,
  PanelRightClose,
  Rocket,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  SquareTerminal,
  Terminal,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";

import { Footer } from "@/components/landing/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useBuildStreamStore, useProjectStore } from "@/stores";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

type TreeItem = {
  name: string;
  depth: number;
  kind: "folder-open" | "folder-closed" | "file";
  dotCls?: string;
  label?: string;
  badge?: string;
  active?: boolean;
  iconCls?: string;
  unsaved?: boolean;
};

const fileTree: TreeItem[] = [
  { name: "src", depth: 0, kind: "folder-open" },
  { name: "app", depth: 1, kind: "folder-open" },
  { name: "api", depth: 2, kind: "folder-open" },
  { name: "tasks", depth: 3, kind: "folder-open" },
  {
    name: "route.ts",
    depth: 4,
    kind: "file",
    dotCls: "bg-brand-cyan",
    label: "route.ts",
    badge: "API",
    active: true,
  },
  { name: "page.tsx", depth: 3, kind: "file", dotCls: "bg-brand-purple" },
  { name: "layout.tsx", depth: 2, kind: "file", dotCls: "bg-brand-purple" },
  { name: "components", depth: 1, kind: "folder-open" },
  { name: "TaskCard.tsx", depth: 2, kind: "file", iconCls: "text-zinc-500" },
  { name: "TaskForm.tsx", depth: 2, kind: "file", iconCls: "text-zinc-500" },
  { name: "TaskList.tsx", depth: 2, kind: "file", iconCls: "text-zinc-500" },
  { name: "lib", depth: 1, kind: "folder-closed" },
  { name: "prisma", depth: 0, kind: "folder-open" },
  {
    name: "schema.prisma",
    depth: 1,
    kind: "file",
    iconCls: "text-brand-green",
    unsaved: true,
  },
  { name: "migrations", depth: 1, kind: "folder-closed" },
  { name: "package.json", depth: 0, kind: "file", iconCls: "text-zinc-500" },
];

const planItems = [
  {
    id: "schema",
    text: "Add dueDate DateTime? to the Task model",
    path: "prisma/schema.prisma",
    pathCls: "text-zinc-500",
  },
  {
    id: "migration",
    text: "Create a migration",
    path: "prisma/migrations",
    pathCls: "text-zinc-500",
  },
  {
    id: "route",
    text: "Accept dueDate on create and update",
    path: "app/api/tasks/route.ts",
    pathCls: "text-brand-cyan",
  },
  {
    id: "form",
    text: "Add a date picker to the task form",
    path: "components/TaskForm.tsx",
    pathCls: "text-zinc-500",
  },
  {
    id: "card",
    text: "Display the due date on task cards",
    path: "components/TaskCard.tsx",
    pathCls: "text-zinc-500",
  },
];

const historyEntries = [
  { title: "Add due date to tasks", when: "2 minutes ago", undoable: true },
  {
    title: "Fix task creation validation",
    when: "18 minutes ago",
    undoable: true,
  },
  {
    title: "Add team member invitations",
    when: "yesterday",
    undoable: true,
  },
  { title: "Add comment threads", when: "2 days ago", undoable: true },
  { title: "Initial build", when: "2 days ago", undoable: false },
];

/* Code line model */
const kw = "font-medium text-brand-purple";
const str = "text-emerald-300";
const fn = "text-brand-cyan";
const cm = "italic text-zinc-600";

const codeLines: { n: string; body: React.ReactNode; hl?: "target" | "mod" }[] =
  [
    {
      n: "01",
      body: (
        <>
          <span className={kw}>import</span> {"{ NextResponse }"}{" "}
          <span className={kw}>from</span>{" "}
          <span className={str}>&apos;next/server&apos;</span>;
        </>
      ),
    },
    {
      n: "02",
      body: (
        <>
          <span className={kw}>import</span> {"{ prisma }"}{" "}
          <span className={kw}>from</span>{" "}
          <span className={str}>&apos;@/lib/prisma&apos;</span>;
        </>
      ),
    },
    { n: "03", body: <span className={cm}>{"// GET /api/tasks"}</span> },
    {
      n: "04",
      body: (
        <>
          <span className={kw}>export async function</span>{" "}
          <span className={fn}>GET</span>(request: Request) {"{"}
        </>
      ),
    },
    {
      n: "05",
      body: (
        <>
          <span className="pl-6">
            <span className={kw}>const</span> tasks ={" "}
            <span className={kw}>await</span> prisma.task.
            <span className={fn}>findMany</span>({"{"}
          </span>
        </>
      ),
    },
    {
      n: "06",
      body: (
        <span className="pl-12">
          orderBy: {"{"} createdAt:{" "}
          <span className={str}>&apos;desc&apos;</span> {"}"},
        </span>
      ),
    },
    { n: "07", body: <span className="pl-6">{"});"}</span> },
    {
      n: "08",
      body: (
        <span className="pl-6">
          <span className={kw}>return</span> NextResponse.
          <span className={fn}>json</span>({"{"} tasks {"}"});
        </span>
      ),
    },
    { n: "09", body: <>{"}"}</> },
    { n: "10", body: <>&nbsp;</> },
    {
      n: "11",
      body: (
        <span className={cm}>
          {"// PATCH /api/tasks — Update existing task"}
        </span>
      ),
    },
    {
      n: "12",
      body: (
        <>
          <span className={kw}>export async function</span>{" "}
          <span className={fn}>PATCH</span>(request: Request) {"{"}
        </>
      ),
    },
    {
      n: "13",
      body: (
        <span className="pl-6">
          <span className={kw}>const</span> body ={" "}
          <span className={kw}>await</span> request.
          <span className={fn}>json</span>();
        </span>
      ),
    },
    {
      n: "14",
      hl: "target",
      body: (
        <span className="pl-6">
          <span className={kw}>const</span>{" "}
          {"{ id, title, completed, dueDate }"} = body;
        </span>
      ),
    },
    {
      n: "15",
      body: (
        <span className="pl-6">
          <span className={kw}>const</span> updated ={" "}
          <span className={kw}>await</span> prisma.task.
          <span className={fn}>update</span>({"{"}
        </span>
      ),
    },
    {
      n: "16",
      body: (
        <span className="pl-12">
          where: {"{"} id {"}"},
        </span>
      ),
    },
    { n: "17", body: <span className="pl-12">data: {"{"}</span> },
    { n: "18", body: <span className="pl-16">title,</span> },
    { n: "19", body: <span className="pl-16">completed,</span> },
    {
      n: "20",
      hl: "mod",
      body: (
        <span className="pl-16 text-brand-green">
          dueDate: dueDate ? new Date(dueDate) : null,
        </span>
      ),
    },
    { n: "21", body: <span className="pl-12">{"},"}</span> },
    { n: "22", body: <span className="pl-6">{"});"}</span> },
    {
      n: "23",
      body: (
        <span className="pl-6">
          <span className={kw}>return</span> NextResponse.
          <span className={fn}>json</span>({"{"} task: updated {"}"});
        </span>
      ),
    },
    { n: "24", body: <>{"}"}</> },
  ];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function BuildWorkbench() {
  const activeProjectName = useProjectStore((s) => s.activeProjectName);
  const streamStatus = useBuildStreamStore((s) => s.status);
  const currentStep = useBuildStreamStore((s) => s.currentStep);

  const [mode, setMode] = useState<"code" | "preview">("code");
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(planItems.map((p) => [p.id, true])),
  );
  const [historyOpen, setHistoryOpen] = useState(false);

  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="flex min-h-screen w-full flex-col bg-brand-dark">
      {/* ---------------- Workbench toolbar ---------------- */}
      <div className="flex h-11 w-full select-none items-center justify-between border-b border-white/[0.08] bg-brand-dark px-3">
        {/* Left: breadcrumb + status */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex min-w-0 items-center gap-1.5 font-mono-tech text-[11px] text-zinc-400">
            <span className="text-sm font-medium text-zinc-100">{activeProjectName || "TaskFlow"}</span>
            <span className="text-zinc-600">/</span>
            <span>src</span>
            <span className="text-zinc-600">/</span>
            <span>app</span>
            <span className="hidden text-zinc-600 sm:inline">/</span>
            <span className="hidden sm:inline">api</span>
            <span className="hidden text-zinc-600 sm:inline">/</span>
            <span className="hidden sm:inline">tasks</span>
            <span className="hidden text-zinc-600 md:inline">/</span>
            <span className="hidden font-medium text-brand-purple md:inline">
              route.ts
            </span>
          </div>
          <div className="mx-1 hidden h-3 w-px bg-white/10 md:block" />
          <div className="hidden items-center gap-1.5 rounded-sm bg-brand-surface-muted px-1.5 py-0.5 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
            <span className="font-mono-tech text-[10px] uppercase tracking-wider text-brand-green">
              {streamStatus || "Ready"}
            </span>
          </div>
          <div className="hidden items-center gap-1.5 lg:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-cyan" />
            <span className="font-mono-tech text-[10px] text-zinc-500">
              agent sync active (34ms)
            </span>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2">
          {/* Code / Preview toggle */}
          <div className="flex items-center rounded-sm bg-brand-surface p-0.5">
            <button
              type="button"
              onClick={() => setMode("code")}
              className={cn(
                "flex items-center gap-1 rounded-sm px-2.5 py-1 font-mono-tech text-[11px] transition-colors",
                mode === "code"
                  ? "bg-brand-surface-muted text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-200",
              )}
            >
              <Code2 className="h-3.5 w-3.5" />
              Code
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={cn(
                "flex items-center gap-1 rounded-sm px-2.5 py-1 font-mono-tech text-[11px] transition-colors",
                mode === "preview"
                  ? "bg-brand-surface-muted text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-200",
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>

          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-sm bg-brand-surface px-2.5 py-1 font-mono-tech text-[11px] text-zinc-400 transition-colors hover:bg-brand-surface-muted hover:text-zinc-200 md:flex"
          >
            <GitFork className="h-3.5 w-3.5 text-zinc-500" />
            feat/task-due-date
            <ChevronDown className="h-3 w-3 text-zinc-600" />
          </button>

          <button
            type="button"
            className="hidden items-center gap-2 rounded-sm bg-brand-surface px-2.5 py-1 font-mono-tech text-[11px] text-zinc-400 transition-colors hover:text-zinc-200 xl:flex"
          >
            <Search className="h-3.5 w-3.5" />
            Quick jump
            <kbd className="rounded bg-brand-surface-muted px-1 py-0.5 text-[10px] text-zinc-600">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            title="Save file (⌘S)"
            className="rounded-sm p-1.5 text-zinc-500 transition-colors hover:bg-brand-surface hover:text-zinc-200"
          >
            <Save className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Share snapshot"
            className="rounded-sm p-1.5 text-zinc-500 transition-colors hover:bg-brand-surface hover:text-zinc-200"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <Button
            size="sm"
            className="h-7 gap-1.5 rounded-sm px-3 font-mono-tech text-[11px]"
          >
            <Rocket className="h-3.5 w-3.5" />
            Deploy
          </Button>
        </div>
      </div>

      {/* ---------------- 3-column split ---------------- */}
      <div className="flex min-h-[calc(100vh-88px)] flex-1 flex-col lg:flex-row">
        {/* 1. File explorer */}
        <aside className="flex w-full flex-shrink-0 flex-col justify-between bg-brand-dark lg:w-[240px]">
          <div className="flex flex-col">
            <div className="flex h-8 items-center justify-between bg-brand-surface px-3 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
              <span className="flex items-center gap-1">
                <FolderTree className="h-3.5 w-3.5" />
                Explorer
              </span>
              <div className="flex items-center gap-1">
                <button className="p-0.5 hover:text-zinc-200" title="New file">
                  <ListPlus className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-0.5 hover:text-zinc-200"
                  title="Collapse all"
                >
                  <ListCollapse className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="py-1 font-mono-tech text-[11px] text-zinc-400">
              {fileTree.map((item, i) => (
                <div
                  key={`${item.name}-${i}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 py-1 pr-3 hover:bg-brand-surface/60",
                    item.active && "bg-brand-surface-muted",
                  )}
                  style={{ paddingLeft: `${12 + item.depth * 14}px` }}
                >
                  {item.kind.startsWith("folder") ? (
                    <>
                      {item.kind === "folder-open" ? (
                        <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                      )}
                      {item.kind === "folder-open" ? (
                        <FolderOpen className="h-4 w-4 text-brand-purple" />
                      ) : (
                        <Folder className="h-4 w-4 text-zinc-500" />
                      )}
                      <span
                        className={item.active ? "text-zinc-100" : undefined}
                      >
                        {item.name}
                      </span>
                    </>
                  ) : (
                    <>
                      {item.dotCls ? (
                        <span
                          className={cn(
                            "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                            item.dotCls,
                          )}
                        />
                      ) : (
                        <FileText className={cn("h-3.5 w-3.5", item.iconCls)} />
                      )}
                      <span
                        className={cn(
                          "truncate",
                          item.badge && "text-brand-cyan",
                        )}
                      >
                        {item.name}
                      </span>
                      {item.badge ? (
                        <Badge
                          variant="cyan"
                          mono
                          className="ml-auto border-transparent bg-brand-cyan/10"
                        >
                          {item.badge}
                        </Badge>
                      ) : null}
                      {item.unsaved ? (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-cyan/60" />
                      ) : null}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between bg-brand-surface p-2 font-mono-tech text-[11px] text-zinc-600">
            <span className="text-brand-green">+18</span>
            <span className="text-rose-400">-2</span>
            <span>in 5 files</span>
            <span>•</span>
            <span>19 items</span>
          </div>
        </aside>

        {/* 2. Code editor */}
        <section className="flex min-w-0 flex-1 flex-col justify-between bg-brand-surface-muted">
          <div className="flex flex-col">
            {/* Tabs */}
            <div className="flex h-9 select-none items-center overflow-x-auto bg-brand-dark">
              <div className="flex h-full items-center gap-2 bg-brand-surface-muted px-3 font-mono-tech text-[11px] text-zinc-100">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
                route.ts
                <button className="rounded-sm p-0.5 text-zinc-600 hover:bg-brand-surface-muted hover:text-zinc-200">
                  <X className="h-3 w-3" />
                </button>
              </div>
              {["schema.prisma", "TaskForm.tsx"].map((tab) => (
                <div
                  key={tab}
                  className="flex h-full cursor-pointer items-center gap-2 bg-brand-dark px-3 font-mono-tech text-[11px] text-zinc-500 transition-colors hover:bg-brand-surface-muted/60"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      tab === "schema.prisma"
                        ? "bg-brand-green"
                        : "bg-brand-purple",
                    )}
                  />
                  {tab}
                  {tab === "schema.prisma" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan/60" />
                  )}
                  <button className="rounded-sm p-0.5 text-zinc-700 hover:text-zinc-200">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Code surface */}
            <div className="select-text overflow-x-auto p-4 font-mono-tech text-xs leading-relaxed text-zinc-300">
              <div className="grid grid-cols-[36px_1fr] gap-x-4">
                {codeLines.map((line) => (
                  <div key={line.n} className="contents">
                    <div
                      className={cn(
                        "select-none text-right opacity-60",
                        line.hl === "target" && "font-bold text-brand-cyan",
                        line.hl === "mod" && "font-bold text-brand-green",
                      )}
                    >
                      {line.n}
                    </div>
                    <div
                      className={cn(
                        "-mx-4 px-4",
                        line.hl === "target" && "bg-brand-cyan/10",
                        line.hl === "mod" && "bg-brand-green/10",
                      )}
                    >
                      {line.body}
                      {line.hl === "target" && (
                        <Badge variant="cyan" mono className="float-right">
                          Target Insertion
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Editor status line */}
          <div className="flex h-7 select-none items-center justify-between bg-brand-dark px-3 font-mono-tech text-[10px] text-zinc-500">
            <div className="flex items-center gap-4">
              <span>TypeScript</span>
              <span>UTF-8</span>
              <span>Ln 14, Col 22</span>
              <span>2 spaces</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-brand-green">
                <CheckCircle2 className="h-3 w-3" />
                PRETTIER OK
              </span>
              <span className="flex items-center gap-1 text-brand-cyan">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
                AGENT SYNC: READY
              </span>
            </div>
          </div>
        </section>

        {/* 3. Agent panel */}
        <aside className="flex w-full flex-shrink-0 flex-col justify-between bg-brand-dark lg:w-[380px]">
          {/* Agent header */}
          <div className="flex h-10 select-none items-center justify-between bg-brand-dark px-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-cyan" />
              <span className="text-sm font-medium text-zinc-100">Agent:</span>
              <span className="font-mono-tech text-[11px] text-brand-cyan">
                kairo-agent-v2
              </span>
            </div>
            <div className="flex items-center gap-1 text-zinc-500">
              {[Loader, Settings, PanelRightClose].map((Icon, i) => (
                <button
                  key={i}
                  className="rounded-sm p-1 hover:bg-brand-surface-muted hover:text-zinc-200"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-3">
            {/* User prompt bubble */}
            <div className="flex flex-col items-end gap-1">
              <div className="max-w-[90%] rounded-lg bg-brand-surface-muted px-3 py-2 text-sm text-zinc-100 shadow-sm">
                Add a due date field to tasks
              </div>
              <span className="px-1 font-mono-tech text-[10px] text-zinc-600">
                10:41 AM • User
              </span>
            </div>

            {/* Confirmation gate card */}
            <Card className="gap-0 rounded-lg border-white/[0.08] bg-brand-surface-muted p-4 shadow-lg">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">
                      Proposed changes
                    </span>
                    <Badge variant="default" mono className="font-bold">
                      {checkedCount}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Add a due date to tasks.
                  </p>
                </div>
                <Badge variant="cyan" mono>
                  Awaiting Approval
                </Badge>
              </div>

              <div className="space-y-1 pt-3 text-xs">
                {planItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 rounded-sm p-1.5 transition-colors hover:bg-brand-surface-muted"
                  >
                    <Checkbox
                      id={`plan-${item.id}`}
                      checked={checked[item.id]}
                      onCheckedChange={(v) =>
                        setChecked((prev) => ({ ...prev, [item.id]: !!v }))
                      }
                      className="mt-0.5 border-zinc-600 data-[state=checked]:border-brand-purple data-[state=checked]:bg-brand-purple"
                    />
                    <label
                      htmlFor={`plan-${item.id}`}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <span className="text-zinc-200">{item.text}</span>
                      <div
                        className={cn(
                          "mt-0.5 truncate font-mono-tech text-[10px]",
                          item.pathCls,
                        )}
                      >
                        {item.path}
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Diff summary */}
              <div className="mt-2 cursor-pointer rounded-sm bg-brand-dark p-2.5 transition-colors hover:bg-brand-surface-muted/60">
                <div className="flex select-none items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono-tech text-[11px] text-zinc-300">
                    <ArrowDownUp className="h-4 w-4 text-zinc-500" />
                    View diff
                  </div>
                  <div className="flex items-center gap-2 font-mono-tech text-[11px]">
                    <span className="font-medium text-brand-green">+18</span>
                    <span className="font-medium text-rose-400">−2</span>
                    <span className="text-xs text-zinc-600">
                      lines across 5 files
                    </span>
                  </div>
                </div>
              </div>

              {/* Gate actions */}
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Button size="sm" className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Apply changes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/[0.1] bg-brand-surface text-zinc-200"
                  >
                    Edit plan
                  </Button>
                </div>
                <p className="text-center text-xs text-zinc-500">
                  You can undo this after it&apos;s applied.
                </p>
              </div>
            </Card>
          </div>

          {/* Agent chat input */}
          <div className="space-y-1.5 select-none bg-brand-dark p-3">
            <div className="flex items-center gap-2 rounded-sm bg-brand-surface-muted px-3 py-1.5 focus-within:ring-1 focus-within:ring-brand-purple">
              <input
                type="text"
                placeholder="Describe a change or ask a question..."
                className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
              <button
                className="p-1 text-zinc-600 transition-colors hover:text-brand-purple"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-center font-mono-tech text-[10px] text-zinc-600">
              The agent will show you a plan before changing anything.
            </p>
          </div>
        </aside>
      </div>

      {/* ---------------- Console drawer ---------------- */}
      <div className="flex h-10 w-full select-none items-center justify-between border-t border-white/[0.08] bg-brand-dark px-3">
        <div className="flex h-full items-center">
          <button className="flex h-full items-center gap-1.5 bg-brand-surface-muted px-3 font-mono-tech text-[11px] text-zinc-200">
            <SquareTerminal className="h-3.5 w-3.5" />
            Terminal (zsh)
          </button>
          <button className="flex h-full items-center gap-1.5 px-3 font-mono-tech text-[11px] text-zinc-500 transition-colors hover:text-zinc-200">
            <TriangleAlert className="h-3.5 w-3.5" />
            Problems 0
          </button>
          <button className="flex h-full items-center gap-1.5 px-3 font-mono-tech text-[11px] text-zinc-500 transition-colors hover:text-zinc-200">
            <ListCollapse className="h-3.5 w-3.5" />
            Output
          </button>
          <button className="flex h-full items-center gap-1.5 px-3 font-mono-tech text-[11px] text-brand-green">
            <Check className="h-3.5 w-3.5" />
            Tests 14 passed
          </button>
        </div>
        <div className="hidden items-center gap-4 font-mono-tech text-[11px] text-zinc-600 lg:flex">
          <span>
            Git: <span className="text-zinc-300">feat/task-due-date</span>
          </span>
          <span>•</span>
          <span>
            DB: <span className="text-brand-green">Connected (PostgreSQL)</span>
          </span>
          <span>•</span>
          <span>
            Port: <span className="text-zinc-300">3000</span>
          </span>
          <span>•</span>
          <span>
            Node <span className="text-zinc-300">v20.11.0</span>
          </span>
        </div>
      </div>

      {/* ---------------- History drawer ---------------- */}
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-14 right-4 z-40 gap-1.5 border-white/[0.1] bg-brand-surface font-mono-tech text-[11px]"
        onClick={() => setHistoryOpen(true)}
      >
        <History className="h-3.5 w-3.5 text-brand-purple" />
        History
      </Button>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-[420px] border-white/[0.08] bg-brand-surface-muted p-0 sm:max-w-[420px]"
        >
          <SheetHeader className="border-b border-white/[0.08] px-6 py-5">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-100">
              <History className="h-5 w-5 text-brand-purple" />
              History
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="relative space-y-7 pl-6">
              <div className="absolute bottom-2 left-[7px] top-2 w-px bg-white/[0.08]" />
              {historyEntries.map((entry) => (
                <div
                  key={entry.title}
                  className="relative flex flex-col gap-1.5"
                >
                  <span
                    className={cn(
                      "absolute -left-6 top-1.5 h-3 w-3 rounded-full ring-4 ring-brand-surface-muted",
                      entry.undoable ? "bg-brand-green" : "bg-zinc-500",
                    )}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold leading-snug text-zinc-100">
                      {entry.title}
                    </span>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button className="rounded-sm px-2 py-0.5 font-mono-tech text-[10px] text-zinc-400 transition-colors hover:bg-brand-surface-muted hover:text-zinc-100">
                        View
                      </button>
                      {entry.undoable && (
                        <button className="rounded-sm px-2 py-0.5 font-mono-tech text-[10px] font-medium text-brand-cyan transition-colors hover:bg-brand-surface-muted hover:text-zinc-100">
                          Undo
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="font-mono-tech text-[10px] text-zinc-600">
                    {entry.when}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3 border-t border-white/[0.08] bg-brand-surface-muted p-6">
            <Button
              variant="outline"
              className="w-full gap-2 border-white/[0.1] bg-brand-surface"
            >
              <Undo2 className="h-4 w-4 text-zinc-400" />
              Undo last change
            </Button>
            <p className="select-text text-center text-xs leading-relaxed text-zinc-600">
              Undo restores code. Database changes are not reversed.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <Footer />
    </div>
  );
}

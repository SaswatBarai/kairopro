"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Braces, Bug, CheckCircle2, Eraser, Terminal } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { cn } from "@/lib/utils";
import { useBuildStreamStore } from "@/stores";

interface TerminalLine {
  time: string;
  content: ReactNode;
}

const TERMINAL_LINES: TerminalLine[] = [
  {
    time: "[00:00:01]",
    content: (
      <span className="text-zinc-400">
        Parsing requirements from{" "}
        <span className="font-medium text-brand-purple-light">
          PRD-001 (TaskFlow)
        </span>
        ...
      </span>
    ),
  },
  {
    time: "[00:00:02]",
    content: (
      <span>
        Schema verified: <span className="text-brand-green">6 models</span>, 2
        enums, 0 circular dependencies
      </span>
    ),
  },
  {
    time: "[00:00:04]",
    content: (
      <span className="text-zinc-400">
        Initializing Next.js 15 App Router scaffold
      </span>
    ),
  },
  {
    time: "[00:00:06]",
    content: (
      <span>
        Writing <span className="text-brand-cyan">prisma/schema.prisma</span>
      </span>
    ),
  },
  {
    time: "[00:00:08]",
    content: (
      <span className="text-zinc-600">
        $ <span className="text-zinc-100">npm install</span>
      </span>
    ),
  },
  {
    time: "[00:00:14]",
    content: (
      <span className="text-zinc-400">
        added <span className="text-zinc-100">412 packages</span> in 6.2s
      </span>
    ),
  },
  {
    time: "[00:00:15]",
    content: (
      <span className="text-zinc-600">
        ${" "}
        <span className="text-zinc-100">
          npx prisma migrate dev --name init
        </span>
      </span>
    ),
  },
  {
    time: "[00:00:17]",
    content: (
      <span className="text-brand-green">Migration applied: 20250115_init</span>
    ),
  },
  {
    time: "[00:00:18]",
    content: (
      <span className="text-zinc-400">Generating Prisma Client (v5.12)</span>
    ),
  },
  {
    time: "[00:00:20]",
    content: (
      <span>
        Creating route{" "}
        <span className="text-brand-cyan">src/app/api/tasks/route.ts</span>
      </span>
    ),
  },
  {
    time: "[00:00:21]",
    content: (
      <span>
        Creating route{" "}
        <span className="text-brand-cyan">src/app/api/tasks/[id]/route.ts</span>
      </span>
    ),
  },
  {
    time: "[00:00:23]",
    content: (
      <span>
        Creating route{" "}
        <span className="text-brand-cyan">src/app/api/team/route.ts</span>
      </span>
    ),
  },
  {
    time: "[00:00:24]",
    content: (
      <span className="text-zinc-400">
        Compiling server actions &amp; route handlers...
      </span>
    ),
  },
  {
    time: "[00:00:26]",
    content: (
      <span>
        Starting dev server on{" "}
        <span className="underline decoration-zinc-600 underline-offset-2">
          http://localhost:3000
        </span>
      </span>
    ),
  },
  {
    time: "[00:00:27]",
    content: <span className="text-brand-green">Ready in 1.8s</span>,
  },
];

const GENERATED_FILES = [
  { name: "prisma/schema.prisma", size: "2.1 KB" },
  { name: "src/app/api/tasks/route.ts", size: "1.4 KB" },
  { name: "src/app/api/tasks/[id]/route.ts", size: "1.8 KB" },
  { name: "src/app/api/team/route.ts", size: "890 B" },
  { name: "package.json", size: "920 B" },
];

const TABS = [
  {
    id: "terminal",
    label: "Terminal",
    icon: Terminal,
    badge: "live",
    badgeTone: "active",
  },
  {
    id: "code",
    label: "Generated Code",
    icon: Braces,
    badge: "8 files",
    badgeTone: "muted",
  },
  {
    id: "problems",
    label: "Problems",
    icon: Bug,
    badge: "0",
    badgeTone: "muted",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

function lineVariants(index: number) {
  return {
    hidden: { opacity: 0, x: -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { delay: 0.3 + index * 0.09, duration: 0.3 },
    },
  };
}

export function BuildConsole() {
  const [activeTab, setActiveTab] = useState<TabId>("terminal");
  const [cleared, setCleared] = useState(false);
  const [activeFile, setActiveFile] = useState(GENERATED_FILES[0]?.name ?? "");
  const storeLogs = useBuildStreamStore((s) => s.logs);
  const resetStream = useBuildStreamStore((s) => s.resetStream);

  const handleClear = () => {
    setCleared(true);
    resetStream();
  };

  return (
    <FadeIn delay={0.08}>
      <div className="flex w-full flex-col overflow-hidden rounded-[3px] border border-white/[0.08] bg-brand-dark">
        <div className="flex h-10 items-center justify-between border-b border-white/[0.08] bg-white/[0.04] px-3">
          <div className="-mb-px flex h-full items-center gap-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  className={cn(
                    "flex h-full cursor-pointer items-center gap-2 border-b-2 px-3 text-xs transition-colors",
                    isActive
                      ? "border-brand-purple-light font-medium text-zinc-100"
                      : "border-transparent text-zinc-400 hover:text-zinc-100",
                  )}
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon
                    className={cn(
                      "h-[15px] w-[15px]",
                      isActive ? "text-brand-purple-light" : "text-zinc-500",
                    )}
                  />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-[3px] border px-1.5 py-0.5 font-mono-tech text-[10px]",
                      tab.badgeTone === "active"
                        ? "border-white/[0.1] bg-brand-surface-muted text-zinc-400"
                        : "border-white/[0.06] bg-brand-surface-muted text-zinc-500",
                    )}
                  >
                    {tab.id === "terminal" && storeLogs.length > 0 ? storeLogs.length : tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 font-mono-tech text-[11px] text-zinc-500">
            <span className="hidden md:inline">Node v20.12.0</span>
            <span className="hidden select-none md:inline">•</span>
            <span className="hidden text-zinc-400 sm:inline">Next.js 15.1</span>
            <button
              className="cursor-pointer p-1 transition-colors hover:text-zinc-100"
              title="Clear terminal"
              type="button"
              onClick={handleClear}
            >
              <Eraser className="h-[15px] w-[15px]" />
            </button>
          </div>
        </div>

        {activeTab === "terminal" && (
          <div className="min-h-[380px] select-text overflow-x-auto p-3 font-mono-tech text-[13px] leading-[1.65] text-zinc-100">
            {!cleared && (
              <motion.div initial="hidden" animate="visible">
                {TERMINAL_LINES.map((line, index) => (
                  <motion.div
                    className="flex items-start gap-3"
                    key={line.time}
                    variants={lineVariants(index)}
                  >
                    <span className="select-none pt-[2px] font-mono-tech text-[11px] text-zinc-600">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-zinc-500">{line.time}</span>
                    <span>{line.content}</span>
                  </motion.div>
                ))}
                {storeLogs.map((log, index) => (
                  <motion.div
                    className="flex items-start gap-3"
                    key={log.id}
                    variants={lineVariants(TERMINAL_LINES.length + index)}
                  >
                    <span className="select-none pt-[2px] font-mono-tech text-[11px] text-zinc-600">
                      {String(TERMINAL_LINES.length + index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-zinc-500">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span
                      className={cn(
                        log.type === "STDERR" && "text-rose-400",
                        log.type === "EVENT" && "text-brand-cyan",
                        log.type === "CHECKPOINT" && "text-brand-green",
                      )}
                    >
                      {log.content}
                    </span>
                  </motion.div>
                ))}
                <motion.div
                  className="flex items-center gap-3 pt-1"
                  variants={lineVariants(TERMINAL_LINES.length)}
                >
                  <span className="select-none font-mono-tech text-[11px] text-zinc-600">
                    16
                  </span>
                  <span className="text-zinc-500">[00:00:28]</span>
                  <span className="flex items-center gap-1">
                    <span className="text-brand-cyan">agent/writer</span>
                    <span className="text-zinc-600">&gt;</span>
                    <span className="text-zinc-100">
                      synthesizing validation layer for z.object()
                    </span>
                    <span className="ml-1 inline-block h-[14px] w-[7px] animate-pulse bg-brand-cyan" />
                  </span>
                </motion.div>
              </motion.div>
            )}
          </div>
        )}

        {activeTab === "code" && (
          <div className="grid min-h-[380px] grid-cols-1 gap-3 p-3 font-mono-tech text-xs">
            <div className="flex flex-col gap-1 rounded-[3px] border border-white/[0.08] bg-brand-surface-muted p-2">
              <div className="px-1 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
                Created Artifacts
              </div>
              {GENERATED_FILES.map((file) => (
                <button
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-[3px] p-1.5 text-left text-xs transition-colors",
                    activeFile === file.name
                      ? "bg-white/[0.08] font-medium text-brand-purple-light"
                      : "text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100",
                  )}
                  key={file.name}
                  type="button"
                  onClick={() => setActiveFile(file.name)}
                >
                  <span className="truncate">{file.name}</span>
                  <span className="font-mono-tech text-[10px] text-zinc-500">
                    {file.size}
                  </span>
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-[3px] border border-white/[0.08] bg-brand-dark p-3 font-mono-tech text-[11px] leading-relaxed text-zinc-400 md:col-span-3">
              <div className="select-none text-zinc-500">
                // prisma/schema.prisma - Auto-generated by KairoPro Agent
              </div>
              <div className="mt-2 text-brand-purple-light">
                generator <span className="text-zinc-100">client</span> {"{"}
              </div>
              <div className="pl-4">
                provider ={" "}
                <span className="text-brand-cyan">
                  &quot;prisma-client-js&quot;
                </span>
              </div>
              <div className="text-brand-purple-light">{"}"}</div>
              <div className="mt-2 text-brand-purple-light">
                datasource <span className="text-zinc-100">db</span> {"{"}
              </div>
              <div className="pl-4">
                provider ={" "}
                <span className="text-brand-cyan">&quot;postgresql&quot;</span>
              </div>
              <div className="pl-4">
                url = env(
                <span className="text-brand-cyan">
                  &quot;DATABASE_URL&quot;
                </span>
                )
              </div>
              <div className="text-brand-purple-light">{"}"}</div>
              <div className="mt-2 text-brand-purple-light">
                model <span className="text-zinc-100">Task</span> {"{"}
              </div>
              <div className="pl-4">
                id <span className="text-brand-cyan">String</span>{" "}
                <span className="text-zinc-500">@id @default(uuid())</span>
              </div>
              <div className="pl-4">
                title <span className="text-brand-cyan">String</span>
              </div>
              <div className="pl-4">
                status <span className="text-brand-cyan">TaskStatus</span>{" "}
                <span className="text-zinc-500">@default(TODO)</span>
              </div>
              <div className="pl-4">
                createdAt <span className="text-brand-cyan">DateTime</span>{" "}
                <span className="text-zinc-500">@default(now())</span>
              </div>
              <div className="text-brand-purple-light">{"}"}</div>
            </div>
          </div>
        )}

        {activeTab === "problems" && (
          <div className="flex min-h-[380px] flex-col items-center justify-center p-6 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-brand-surface-muted">
              <CheckCircle2 className="h-5 w-5 text-brand-green" />
            </div>
            <div className="text-[15px] font-semibold text-zinc-100">
              No problems detected
            </div>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-400">
              Static analysis, schema verification, and API route contracts are
              passing cleanly with zero warnings or runtime errors.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/[0.08] bg-brand-surface-muted px-3 py-1.5 font-mono-tech text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
              <span className="text-zinc-400">
                Stream: Active (WebSocket 104.28.12.9)
              </span>
            </span>
            <span className="hidden text-zinc-600 md:inline">|</span>
            <span className="hidden text-zinc-400 md:inline">
              Model: kairo-pro-agent-v2
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Buffer: 16 lines</span>
            <span className="text-zinc-600">|</span>
            <span className="text-brand-green">Memory: 184MB</span>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

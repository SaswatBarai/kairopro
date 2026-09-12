"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  Code,
  Eye,
  Lock,
  RotateCcw,
  Rocket,
  SquareCheck,
  Terminal,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type SandboxState =
  "idle" | "building" | "running" | "failed" | "restarting" | "ready";
export type SandboxMode = "terminal" | "preview" | "runtime";

export const SANDBOX_STATUS: Record<
  SandboxState,
  { label: string; chip: string; dot: string }
> = {
  idle: {
    label: "Idle",
    chip: "border-white/[0.08] bg-white/[0.03] text-zinc-400",
    dot: "bg-zinc-500",
  },
  building: {
    label: "Building",
    chip: "border-brand-purple/30 bg-brand-purple/10 text-brand-purple-light",
    dot: "bg-brand-purple-light animate-pulse",
  },
  running: {
    label: "Running",
    chip: "border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan",
    dot: "bg-brand-cyan animate-pulse",
  },
  restarting: {
    label: "Restarting",
    chip: "border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan",
    dot: "bg-brand-cyan animate-pulse",
  },
  failed: {
    label: "Failed",
    chip: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    dot: "bg-rose-400",
  },
  ready: {
    label: "Ready",
    chip: "border-brand-green/25 bg-brand-green/10 text-brand-green",
    dot: "bg-brand-green",
  },
};

interface SandboxPanelProps {
  expanded: boolean;
  height: number;
  state: SandboxState;
  mode: SandboxMode;
  restartCount: number;
  onToggleExpand: () => void;
  onModeChange: (mode: SandboxMode) => void;
  onRestart: () => void;
  onRun: () => void;
  onAskKairo?: () => void;
}

const TERMINAL_LINES: ReactNode[] = [
  <>
    <span className="text-zinc-500">$</span>{" "}
    <span className="text-zinc-100">pnpm dev</span>
  </>,
  <>
    <span className="text-brand-purple-light">▲</span>{" "}
    <span className="text-zinc-200">Next.js 15</span>
  </>,
  <>
    <span className="text-brand-green">✓</span>{" "}
    <span className="text-zinc-400">Ready on</span>{" "}
    <span className="text-brand-cyan underline underline-offset-2">
      http://localhost:3000
    </span>
  </>,
  <>
    <span className="text-brand-cyan">GET</span>{" "}
    <span className="text-zinc-400">/api/tasks</span>{" "}
    <span className="text-brand-green">200</span>
  </>,
  <>
    <span className="text-brand-cyan">POST</span>{" "}
    <span className="text-zinc-400">/api/tasks</span>{" "}
    <span className="text-brand-green">201</span>
  </>,
  <>
    <span className="text-brand-green">✓</span>{" "}
    <span className="text-brand-green/80">24 tests passed</span>
  </>,
];

const RUNTIME_ROWS: Array<[string, string]> = [
  ["Runtime", "Node 20.11.0"],
  ["Framework", "Next.js 15 (App Router)"],
  ["Port", "3000"],
  ["PID", "82914"],
  ["Memory", "412 MB"],
  ["Build time", "8.4 s"],
  ["Tests", "24 passed"],
  ["Region", "iad1"],
];

const PREVIEW_TASKS = [
  { title: "Review Q3 roadmap", done: true, due: "Sep 12", tag: "Low" },
  { title: "Fix billing webhook", done: false, due: "Sep 13", tag: "P1" },
  { title: "Update onboarding copy", done: false, due: "Sep 15", tag: "P2" },
];

function IconButton({
  title,
  onClick,
  active,
  disabled,
  children,
}: {
  title: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-[4px] transition-colors",
        active
          ? "border border-white/[0.08] bg-white/[0.06] text-white"
          : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200",
        disabled &&
          "cursor-default opacity-30 hover:bg-transparent hover:text-zinc-500",
      )}
    >
      {children}
    </button>
  );
}

export function SandboxPanel({
  expanded,
  height,
  state,
  mode,
  restartCount,
  onToggleExpand,
  onModeChange,
  onRestart,
  onRun,
  onAskKairo,
}: SandboxPanelProps) {
  const status = SANDBOX_STATUS[state];
  const canRun = state === "idle" || state === "failed";

  return (
    <section
      style={{ height: expanded ? height : 40 }}
      className="flex shrink-0 flex-col overflow-hidden border-t border-white/[0.07] bg-brand-surface transition-[height] duration-200 ease-out"
    >
      <div
        className={cn(
          "flex h-10 shrink-0 items-center gap-2.5 px-3",
          expanded && "border-b border-white/[0.07]",
        )}
      >
        <span className="font-mono-tech text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-300">
          Sandbox
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono-tech text-[10px] font-medium uppercase tracking-[0.08em]",
            status.chip,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <IconButton title="Run sandbox" onClick={onRun} disabled={!canRun}>
            <Rocket className="h-4 w-4" />
          </IconButton>
          <IconButton title="Restart sandbox" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" />
          </IconButton>
          <span className="mx-1 h-4 w-px bg-white/[0.08]" />
          <IconButton
            title="Preview"
            active={mode === "preview"}
            onClick={() => onModeChange("preview")}
          >
            <Eye className="h-4 w-4" />
          </IconButton>
          <IconButton
            title="Terminal"
            active={mode === "terminal"}
            onClick={() => onModeChange("terminal")}
          >
            <Terminal className="h-4 w-4" />
          </IconButton>
          <IconButton
            title="Runtime info"
            active={mode === "runtime"}
            onClick={() => onModeChange("runtime")}
          >
            <Code className="h-4 w-4" />
          </IconButton>
          <span className="mx-1 h-4 w-px bg-white/[0.08]" />
          <IconButton
            title={expanded ? "Collapse (⌘J)" : "Expand (⌘J)"}
            onClick={onToggleExpand}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </IconButton>
        </div>
      </div>

      {expanded && (
        <div className="min-h-0 flex-1 overflow-auto">
          {mode === "terminal" && state === "failed" ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-brand-dark p-4 text-center font-mono-tech">
              <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-rose-400">
                ✗ Build failed
              </p>
              <p className="text-[12px] text-zinc-300">
                src/app/api/tasks/route.ts:42
              </p>
              <p className="text-[12px] text-zinc-500">
                Property &apos;subtasks&apos; does not exist on type
                &apos;Task&apos;
              </p>
              <button
                type="button"
                onClick={onAskKairo}
                className="mt-1 h-7 rounded-[4px] border border-rose-400/30 bg-rose-400/10 px-3 text-[11px] text-rose-300 transition-colors hover:bg-rose-400/20"
              >
                [ Ask Kairo to fix ]
              </button>
            </div>
          ) : mode === "terminal" ? (
            <motion.div
              key={restartCount}
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.35 } } }}
              className="bg-brand-dark p-3 font-mono-tech text-[12px] leading-[20px]"
            >
              {TERMINAL_LINES.map((line, i) => (
                <motion.div
                  key={i}
                  variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
                >
                  {line}
                </motion.div>
              ))}
              <div className="mt-0.5">
                <span className="text-zinc-500">$ </span>
                <span className="inline-block h-[13px] w-[7px] animate-pulse bg-zinc-400/80 align-middle" />
              </div>
            </motion.div>
          ) : mode === "preview" ? (
            <div className="m-3 overflow-hidden rounded-md border border-white/[0.08] bg-[#f7f7f9]">
              <div className="flex h-8 items-center gap-2 border-b border-black/[0.06] bg-[#ececef] px-3">
                <span className="h-2 w-2 rounded-full bg-rose-400/70" />
                <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
                <span className="mx-auto flex h-5.5 w-fit items-center gap-1.5 rounded-[4px] border border-black/[0.06] bg-white px-2.5 font-mono-tech text-[10px] text-zinc-500">
                  <Lock className="h-2.5 w-2.5" />
                  localhost:3000
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-brand-purple font-mono-tech text-[9px] font-bold text-white">
                    T
                  </span>
                  <span className="text-[13px] font-semibold text-zinc-800">
                    TaskFlow
                  </span>
                  <span className="ml-auto rounded-[4px] bg-brand-purple px-2 py-1 text-[10px] font-medium text-white">
                    New task
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {PREVIEW_TASKS.map((task) => (
                    <div
                      key={task.title}
                      className="flex items-center gap-2.5 rounded-md border border-black/[0.06] bg-white p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    >
                      {task.done ? (
                        <SquareCheck className="h-4 w-4 shrink-0 text-brand-purple" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-[3px] border-[1.5px] border-zinc-300" />
                      )}
                      <span
                        className={cn(
                          "text-[12px] font-medium",
                          task.done
                            ? "text-zinc-400 line-through"
                            : "text-zinc-700",
                        )}
                      >
                        {task.title}
                      </span>
                      <span className="ml-auto shrink-0 font-mono-tech text-[10px] text-zinc-400">
                        {task.due}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-[3px] px-1 py-px text-[9px] font-semibold",
                          task.tag === "P1" && "bg-rose-500/10 text-rose-600",
                          task.tag === "P2" && "bg-amber-500/10 text-amber-600",
                          task.tag === "Low" &&
                            "bg-emerald-500/10 text-emerald-600",
                        )}
                      >
                        {task.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 font-mono-tech text-[11px] sm:grid-cols-4">
                {RUNTIME_ROWS.map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                      {label}
                    </p>
                    <p className="mt-0.5 text-zinc-200">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

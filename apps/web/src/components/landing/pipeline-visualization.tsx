"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

type StepState = "done" | "running" | "waiting" | "queued";

const steps: {
  id: string;
  index: string;
  phase: string;
  name: string;
  detail: string;
}[] = [
  {
    id: "spec",
    index: "01 // INGEST",
    phase: "DONE [✓]",
    name: "SPECIFICATION",
    detail: "product-spec.md",
  },
  {
    id: "architecture",
    index: "02 // DESIGN",
    phase: "DONE [✓]",
    name: "ARCHITECTURE",
    detail: "Prisma + Next Router",
  },
  {
    id: "code",
    index: "03 // SYNTHESIS",
    phase: "RUN [●]",
    name: "CODE GEN",
    detail: "42 files synthesized",
  },
  {
    id: "test",
    index: "04 // VERIFY",
    phase: "WAIT [○]",
    name: "TEST SUITE",
    detail: "24 contract tests",
  },
  {
    id: "deploy",
    index: "05 // SHIP",
    phase: "QUEUED [○]",
    name: "DEPLOY",
    detail: "Edge runtime (Vercel)",
  },
];

// Which step is the "active" one on each tick of the cycle (spec + architecture stay done).
const activeCycle = ["code", "test", "deploy"] as const;

function stateFor(stepId: string, active: string): StepState {
  if (stepId === "spec" || stepId === "architecture") return "done";
  if (stepId === active) return "running";
  if (stepId === "deploy" && active !== "deploy") return "queued";
  return "waiting";
}

const stateStyles: Record<StepState, string> = {
  done: "border-emerald-500/40 bg-brand-surface-muted opacity-100",
  running:
    "border-brand-cyan bg-brand-surface-muted opacity-100 shadow-[0_0_15px_rgba(34,211,238,0.15)]",
  waiting: "border-white/[0.06] bg-brand-surface-muted/50 opacity-70",
  queued: "border-white/[0.06] bg-brand-surface-muted/50 opacity-70",
};

const stateLabel: Record<StepState, { text: string; className: string }> = {
  done: { text: "DONE [✓]", className: "text-emerald-400" },
  running: { text: "RUN [●]", className: "text-brand-cyan" },
  waiting: { text: "WAIT [○]", className: "text-zinc-500" },
  queued: { text: "QUEUED [○]", className: "text-zinc-500" },
};

const terminalLines = [
  {
    time: "10:42:01.109",
    tag: "[ast]",
    tagClass: "text-emerald-400",
    text: "AST representation created: schema.prisma validated against spec constraints",
    lineClass: "text-zinc-500",
  },
  {
    time: "10:42:02.482",
    tag: "[schema]",
    tagClass: "text-emerald-400",
    text: "PostgreSQL migration completed with 0 drift in 12ms",
    lineClass: "text-zinc-500",
  },
  {
    time: "10:42:03.901",
    tag: "[agent]",
    tagClass: "text-brand-cyan",
    text: "Generating handlers: src/app/api/tasks/route.ts (Zod verification enabled)",
    lineClass: "text-zinc-100",
  },
  {
    time: "10:42:04.112",
    tag: "[compiler]",
    tagClass: "text-brand-purple-light",
    text: "Synthesizing edge middleware authorization chain...",
    lineClass: "text-brand-purple-light",
    caret: true,
  },
];

export function PipelineVisualization() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => (t + 1) % activeCycle.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const active = activeCycle[tick] ?? "code";

  return (
    <div
      id="compiler"
      className="w-full max-w-5xl overflow-hidden rounded-lg border border-white/[0.09] bg-brand-surface/90 shadow-2xl backdrop-blur-sm"
    >
      {/* Header bar with telemetry */}
      <div className="flex h-10 items-center justify-between border-b border-white/[0.06] bg-brand-surface-muted/90 px-4 font-mono-tech text-[11px]">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          <span className="font-medium text-zinc-100">
            pipeline-telemetry: microvm-us-east
          </span>
          <span className="hidden text-zinc-600 sm:inline">
            | session #kpr-8849
          </span>
        </div>
        <div className="flex items-center gap-4 text-zinc-500">
          <span className="hidden md:inline">KERNEL: 6.8.1-ALPINE</span>
          <span className="rounded border border-brand-cyan/20 bg-brand-cyan/10 px-2 py-0.5 text-brand-cyan">
            STATE: AUTO_SYNC
          </span>
        </div>
      </div>

      {/* Node pipeline sequence */}
      <div className="border-b border-white/[0.05] bg-brand-dark/60 px-6 py-8">
        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-5">
          {steps.map((step) => {
            const state = stateFor(step.id, active);
            const label = stateLabel[state];
            return (
              <div
                key={step.id}
                className={cn(
                  "rounded border p-3.5 text-left transition-all duration-300",
                  stateStyles[state],
                  step.id === "deploy" && "col-span-2 sm:col-span-1",
                )}
              >
                <div className="mb-1.5 flex items-center justify-between font-mono-tech text-[10px]">
                  <span className="text-zinc-500">{step.index}</span>
                  <span
                    className={cn(
                      "flex items-center gap-1 font-medium",
                      label.className,
                    )}
                  >
                    {state === "running" && (
                      <span className="h-1.5 w-1.5 animate-ping rounded-full bg-brand-cyan" />
                    )}
                    {label.text}
                  </span>
                </div>
                <div className="font-mono-tech text-xs font-semibold text-zinc-100">
                  {step.name}
                </div>
                <div
                  className={cn(
                    "mt-1 truncate text-[11px]",
                    state === "running" ? "text-brand-cyan" : "text-zinc-500",
                  )}
                >
                  {step.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal stream ticker */}
      <div className="overflow-hidden p-4 font-mono-tech text-left text-xs leading-relaxed text-zinc-400">
        <div className="mb-2 flex items-center justify-between border-b border-white/[0.05] pb-2 text-[10px] uppercase text-zinc-500">
          <span>Active Compiler Subprocess — PID 8044</span>
          <span className="text-brand-cyan">V8 Isolate #04</span>
        </div>
        <div className="space-y-1 text-[11px]">
          <AnimatePresence initial={false}>
            {terminalLines.map((line, i) => (
              <motion.div
                key={line.time}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.35 }}
                className={cn(
                  "flex items-center gap-1",
                  line.lineClass,
                  line.caret && "text-brand-purple-light",
                )}
              >
                <span className="text-zinc-600">{line.time}</span>
                <span className={line.tagClass}>{line.tag}</span>
                <span>{line.text}</span>
                {line.caret && (
                  <span className="inline-block h-3.5 w-1.5 animate-pulse bg-brand-cyan" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

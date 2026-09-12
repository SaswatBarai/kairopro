"use client";

import { motion } from "motion/react";

import { FadeIn } from "@/components/landing/fade-in";
import { SectionHeading } from "@/components/landing/section-heading";

const specRequirements = [
  {
    id: "req-1",
    title: "### 1. Multi-tenant RBAC",
    titleClass: "text-zinc-100 group-hover:text-brand-purple-light",
    detail: "Role hierarchy: ADMIN, DEVELOPER, AUDITOR. Scoped to Organization ID.",
  },
  {
    id: "req-2",
    title: "### 2. Endpoint: POST /api/tasks",
    titleClass: "text-brand-cyan",
    detail:
      'Payload: { title: string, priority: "p0"|"p1"|"p2", assigneeId: uuid }',
  },
  {
    id: "req-3",
    title: "### 3. PostgreSQL Database Model",
    titleClass: "text-brand-green",
    detail:
      "prisma: Task, Workspace, User with foreign key cascades and indexes.",
  },
];

const taskRows = [
  {
    id: "TASK-102: Migrate auth middleware",
    dot: "bg-emerald-400",
    priority: "P0",
    badge: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  },
  {
    id: "TASK-103: Seed tenant partition keys",
    dot: "bg-amber-400",
    priority: "P1",
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  {
    id: "TASK-104: Vitest integration contracts",
    dot: "bg-brand-cyan",
    priority: "P2",
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
];

export function SpecToSoftware() {
  return (
    <section
      id="spec-to-software"
      className="mx-auto max-w-6xl border-t border-white/[0.06] px-6 py-24"
    >
      <FadeIn>
        <SectionHeading
          eyebrow="TRANSFORMATION ENGINE"
          title="Your documentation becomes your application."
          description="No vague wireframes. No hallucinated components. The system derives deterministic schemas, REST endpoints, and UI state directly from approved PRDs."
        />
      </FadeIn>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        {/* Left: Product specification (markdown PRD view) */}
        <FadeIn className="lg:col-span-5" delay={0.1}>
          <div className="flex h-full flex-col justify-between rounded-lg border border-white/[0.08] bg-brand-surface p-5 font-mono-tech text-xs">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3 text-[11px] text-zinc-500">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                  <span className="text-[#e4e1e9]">
                    SPECIFICATION // specs/task_suite.md
                  </span>
                </div>
                <span className="rounded bg-brand-purple/10 px-2 py-0.5 text-brand-purple">
                  SOURCE OF TRUTH
                </span>
              </div>
              <div className="space-y-3 text-[11.5px] leading-relaxed text-zinc-400">
                <div className="italic text-zinc-500">
                  {"// Requirements input approved by eng team"}
                </div>
                <div className="font-semibold text-zinc-100">
                  # Project: Task Orchestration Core
                </div>
                {specRequirements.map((req) => (
                  <div
                    key={req.id}
                    className="group cursor-pointer rounded border border-white/[0.05] bg-brand-surface-muted p-2.5 transition-colors hover:border-brand-purple/50"
                  >
                    <div className={`font-medium ${req.titleClass}`}>
                      {req.title}
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {req.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4 text-[11px] text-zinc-500">
              <span>Spec SHA: 8fbc190</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Strict Spec Pass
              </span>
            </div>
          </div>
        </FadeIn>

        {/* Center: data stream line (hidden on small screens) */}
        <div className="relative hidden flex-col items-center justify-center lg:flex lg:col-span-2">
          <div className="relative h-[1px] w-full bg-gradient-to-r from-brand-purple/60 via-brand-cyan/80 to-emerald-400/60">
            <motion.span
              className="absolute left-0 top-[-4px] h-2.5 w-2.5 rounded-full bg-brand-cyan shadow-[0_0_10px_#22D3EE]"
              animate={{ x: ["0%", "min(28rem, 100%)"], opacity: [0, 1, 1, 0] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: [0.4, 0, 0.2, 1],
                times: [0, 0.2, 0.8, 1],
              }}
            />
          </div>
          <span className="mt-3 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
            Synthesizing
          </span>
        </div>

        {/* Right: working application preview */}
        <FadeIn className="lg:col-span-5" delay={0.2}>
          <div className="flex h-full flex-col justify-between rounded-lg border border-white/[0.08] bg-brand-surface p-5">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  </div>
                  <span className="ml-2 font-mono-tech text-[11px] text-zinc-100">
                    localhost:3000/app/tasks
                  </span>
                </div>
                <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono-tech text-[10px] text-emerald-400">
                  LIVE COMPONENT
                </span>
              </div>

              {/* Simulated application component */}
              <div className="rounded border border-white/[0.06] bg-brand-surface-muted p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100">
                      Engineering Tasks
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Workspace: infra-core-prod
                    </p>
                  </div>
                  <span className="cursor-pointer rounded bg-brand-purple px-2 py-1 text-[11px] font-medium text-white hover:opacity-90">
                    + New Task
                  </span>
                </div>
                <div className="space-y-2">
                  {taskRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between rounded border border-white/[0.04] bg-brand-surface p-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${row.dot}`}
                        />
                        <span className="font-mono-tech text-xs text-[#e4e1e9]">
                          {row.id}
                        </span>
                      </div>
                      <span
                        className={`rounded border px-1.5 py-0.5 font-mono-tech text-[10px] ${row.badge}`}
                      >
                        {row.priority}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3 font-mono-tech text-[10px] text-zinc-500">
                  <span>DATABASE: PostgreSQL 15</span>
                  <span>STATUS: 200 OK (3ms)</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4 font-mono-tech text-[11px] text-zinc-500">
              <span>Next.js 14.2 App Router</span>
              <span className="text-brand-cyan">Dynamic Edge SSR</span>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

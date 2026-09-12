import { BadgeCheck, CheckCircle2 } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";

const PHASES = [
  { phase: "Phase 01", name: "Parse PRD", duration: "2s" },
  { phase: "Phase 02", name: "DB Schema", duration: "6s" },
  { phase: "Phase 03", name: "API Routes", duration: "14s" },
  { phase: "Phase 04", name: "Build UI", duration: "28s" },
  { phase: "Phase 05", name: "NextAuth v5", duration: "12s" },
  { phase: "Phase 06", name: "Vitest CI", duration: "18s" },
  { phase: "Phase 07", name: "Preview Edge", duration: "22s" },
];

export function PipelineChecklist() {
  return (
    <FadeIn>
      <section className="flex flex-col gap-3 rounded-lg border border-white/[0.08] bg-brand-surface-muted p-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Synthesis Pipeline Execution
            </h3>
            <p className="text-xs text-zinc-400">
              Deterministic compilation graph completed across 7 distinct worker
              nodes.
            </p>
          </div>
          <div className="flex items-center gap-1.5 font-mono-tech text-[11px] text-brand-green">
            <BadgeCheck className="h-4 w-4" />
            <span>100% Deterministic Spec Reached</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {PHASES.map((item) => (
            <div
              className="flex flex-col justify-between gap-1 rounded-lg bg-brand-surface p-2 transition-colors hover:bg-white/[0.05]"
              key={item.phase}
            >
              <div className="flex items-center justify-between">
                <CheckCircle2 className="h-4 w-4 text-brand-green" />
                <span className="font-mono-tech text-[11px] font-medium text-zinc-400">
                  {item.duration}
                </span>
              </div>
              <div>
                <div className="font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
                  {item.phase}
                </div>
                <div className="mt-0.5 text-[13px] font-semibold leading-tight text-zinc-100">
                  {item.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}

import { Check, Network } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { cn } from "@/lib/utils";

type StepStatus = "done" | "active" | "queued";

interface PipelineStep {
  label: string;
  status: StepStatus;
  duration?: string;
  tag?: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { label: "Understanding requirements", status: "done", duration: "2s" },
  { label: "Generating database schema", status: "done", duration: "6s" },
  { label: "Creating API routes", status: "active", tag: "src/app/api/*" },
  { label: "Building pages", status: "queued" },
  { label: "Setting up authentication", status: "queued" },
  { label: "Running tests", status: "queued" },
  { label: "Preparing preview", status: "queued" },
];

export function ExecutionPipeline() {
  return (
    <FadeIn>
      <div className="w-full overflow-hidden rounded-[3px] border border-white/[0.08] bg-brand-surface">
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-brand-surface-muted px-3 py-2">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-100">
              Agent Execution Pipeline
            </span>
          </div>
          <div className="font-mono-tech text-[11px] text-zinc-400">
            <span className="text-brand-green">2</span> / 7 completed
          </div>
        </div>

        <div className="flex flex-col divide-y divide-white/[0.06] text-sm">
          {PIPELINE_STEPS.map((step) => {
            if (step.status === "active") {
              return (
                <div
                  className="relative flex items-center justify-between bg-brand-cyan/[0.03] px-3 py-2.5"
                  key={step.label}
                >
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 top-0 w-[2px] bg-brand-cyan" />
                  <div className="flex items-center gap-3">
                    <span className="flex h-4 w-4 items-center justify-center">
                      <span className="h-2 w-2 animate-ping rounded-full bg-brand-cyan" />
                    </span>
                    <span className="flex items-center gap-2 font-medium text-zinc-100">
                      <span>{step.label}</span>
                      {step.tag && (
                        <span className="rounded-[3px] border border-white/[0.08] bg-brand-surface-muted px-1.5 py-px font-mono-tech text-[11px] text-zinc-500">
                          {step.tag}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-[3px] border border-brand-cyan/30 bg-brand-cyan/10 px-1.5 py-0.5 font-mono-tech text-[11px] text-brand-cyan">
                      in progress
                    </span>
                  </div>
                </div>
              );
            }

            if (step.status === "done") {
              return (
                <div
                  className="flex items-center justify-between bg-white/[0.02] px-3 py-2"
                  key={step.label}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
                      <Check className="h-3 w-3 font-bold" strokeWidth={3} />
                    </span>
                    <span className="text-zinc-100">{step.label}</span>
                  </div>
                  <span className="font-mono-tech text-[11px] text-zinc-500">
                    {step.duration}
                  </span>
                </div>
              );
            }

            return (
              <div
                className="flex items-center justify-between px-3 py-2 opacity-60"
                key={step.label}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-4 w-4 items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full border border-zinc-500" />
                  </span>
                  <span className="text-zinc-400">{step.label}</span>
                </div>
                <span className="font-mono-tech text-[11px] text-zinc-500">
                  queued
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </FadeIn>
  );
}

import { Check, Network } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { stepStates, type BuildViewState } from "@/lib/build-view";

interface ExecutionPipelineProps {
  view: BuildViewState;
  /** The build was cancelled or ended: nothing is in progress any more, so
   * a step that was mid-way stops pulsing. */
  stopped: boolean;
}

export function ExecutionPipeline({ view, stopped }: ExecutionPipelineProps) {
  const steps = stepStates(view);
  const done = steps.filter((s) => s.state === "done").length;
  const writing =
    view.activeFile && view.files[view.activeFile]?.status === "writing"
      ? view.activeFile
      : null;

  return (
    <FadeIn>
      <div className="w-full overflow-hidden rounded-[3px] border border-white/[0.08] bg-brand-surface">
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-brand-surface-muted px-3 py-2">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-100">
              What the agent is doing
            </span>
          </div>
          <div className="font-mono-tech text-[11px] text-zinc-400">
            <span className="text-brand-green">{done}</span> / {steps.length}{" "}
            completed
          </div>
        </div>

        <ol className="flex flex-col divide-y divide-white/[0.06] text-sm">
          {steps.map((step) => {
            if (step.state === "running" && !stopped) {
              return (
                <li
                  className="relative flex items-center justify-between bg-brand-cyan/[0.03] px-3 py-2.5"
                  key={step.id}
                >
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 top-0 w-[2px] bg-brand-cyan" />
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      <span className="h-2 w-2 animate-ping rounded-full bg-brand-cyan" />
                    </span>
                    <span className="flex min-w-0 items-center gap-2 font-medium text-zinc-100">
                      <span>{step.label}</span>
                      {writing && (
                        <span className="truncate rounded-[3px] border border-white/[0.08] bg-brand-surface-muted px-1.5 py-px font-mono-tech text-[11px] text-zinc-500">
                          {writing}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-[3px] border border-brand-cyan/30 bg-brand-cyan/10 px-1.5 py-0.5 font-mono-tech text-[11px] text-brand-cyan">
                    in progress
                  </span>
                </li>
              );
            }

            if (step.state === "done") {
              return (
                <li
                  className="flex items-center gap-3 bg-white/[0.02] px-3 py-2"
                  key={step.id}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-zinc-100">{step.label}</span>
                </li>
              );
            }

            return (
              <li
                className="flex items-center gap-3 px-3 py-2 opacity-60"
                key={step.id}
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full border border-zinc-500" />
                </span>
                <span className="text-zinc-400">{step.label}</span>
                <span className="ml-auto font-mono-tech text-[11px] text-zinc-500">
                  {step.state === "running" ? "stopped" : "queued"}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </FadeIn>
  );
}

import { FadeIn } from "@/components/landing/fade-in";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StageState = "done" | "active" | "audited" | "idle";

const stages: {
  num: string;
  name: string;
  detail: string;
  state: StageState;
}[] = [
  { num: "01", name: "Ingest", detail: "Specs & Tokens", state: "done" },
  { num: "02", name: "Verify", detail: "3-Artifact Gate", state: "done" },
  { num: "03", name: "Compile", detail: "Agent Scaffolder", state: "active" },
  { num: "04", name: "Audit", detail: "Self-healing AST", state: "audited" },
  { num: "05", name: "Stage", detail: "Edge Sandbox", state: "idle" },
  { num: "06", name: "Export", detail: "Zero Lock-in", state: "idle" },
];

const stateBorder: Record<StageState, string> = {
  done: "border-brand-purple/70",
  active: "border-brand-cyan",
  audited: "border-brand-green/70",
  idle: "border-zinc-700",
};

const stateLabel: Record<StageState, string> = {
  done: "text-zinc-500",
  active: "text-brand-cyan",
  audited: "text-brand-green",
  idle: "text-zinc-500",
};

export function FeaturesHero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-12 lg:pb-24">
      <FadeIn className="flex flex-col items-start gap-6">
        <Badge
          variant="secondary"
          mono
          className="gap-1.5 px-2.5 py-1 text-brand-cyan"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
          Capabilities &amp; Pipeline Overview
        </Badge>

        <div className="flex max-w-4xl flex-col gap-4">
          <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-zinc-100 md:text-[40px] md:leading-[48px]">
            Everything you need to ship a first version.
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-400 md:text-base">
            From raw markdown PRDs to production-ready Next.js repositories
            running in isolated sandbox environments with automated
            verification, schema extraction, and human approval gates.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 pt-6 md:grid-cols-6">
          {stages.map((stage) => (
            <div
              key={stage.num}
              className={cn(
                "flex flex-col gap-1 rounded-[3px] border border-white/[0.06] border-l-2 bg-brand-surface p-3",
                stateBorder[stage.state],
              )}
            >
              {stage.state === "active" ? (
                <span className="flex items-center gap-1 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-cyan">
                  <span className="h-1 w-1 animate-ping rounded-full bg-brand-cyan" />
                  {stage.num} / {stage.name}
                </span>
              ) : (
                <span
                  className={cn(
                    "font-mono-tech text-[10px] font-semibold uppercase tracking-wider",
                    stateLabel[stage.state],
                  )}
                >
                  {stage.num} / {stage.name}
                </span>
              )}
              <span className="font-mono-tech text-[11px] font-medium text-zinc-200">
                {stage.detail}
              </span>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}

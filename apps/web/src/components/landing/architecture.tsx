import { FadeIn } from "@/components/landing/fade-in";
import { SectionHeading } from "@/components/landing/section-heading";
import { Card } from "@/components/ui/card";

const coreLayers = [
  { label: "DATABASE", cls: "text-brand-cyan" },
  { label: "API ROUTES", cls: "text-brand-purple-light" },
  { label: "AUTH RBAC", cls: "text-emerald-400" },
  { label: "UI COMPONENTS", cls: "text-white" },
];

const outputStages = [
  {
    stage: "STAGE 01",
    stageCls: "text-zinc-500",
    name: "NEXT.JS 14 CODE",
    cls: "border-white/[0.08]",
  },
  {
    stage: "STAGE 02",
    stageCls: "text-brand-cyan",
    name: "VITEST MICROVM",
    cls: "border-brand-cyan/30",
  },
  {
    stage: "STAGE 03",
    stageCls: "text-emerald-400",
    name: "VERCEL EDGE SHIP",
    cls: "border-emerald-500/30",
  },
];

export function Architecture() {
  return (
    <section
      id="architecture"
      className="mx-auto max-w-6xl border-t border-white/[0.06] px-6 py-20"
    >
      <FadeIn>
        <SectionHeading
          eyebrow="TOPOLOGY GRAPH"
          title="Architecture System Diagram"
          description="Direct representation of isolated compiler sub-layers."
        />
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="relative gap-0 overflow-hidden rounded-lg border-white/[0.08] bg-brand-surface p-8 shadow-none">
          <div className="flex flex-col items-center gap-8 text-center font-mono-tech">
            {/* Top: spec input */}
            <div className="rounded border border-white/[0.12] bg-brand-surface-muted px-6 py-2.5 text-xs text-zinc-100 shadow-md">
              SPECIFICATION INPUT (.md / .json / tickets)
            </div>
            <div className="h-6 w-[1px] bg-white/[0.15]" />

            {/* Core engine */}
            <div className="w-full max-w-xl rounded-lg border border-brand-purple/50 bg-brand-surface-muted p-6 shadow-[0_0_25px_rgba(109,94,245,0.15)]">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-100">
                KAIRO COMPILER CORE
              </div>
              <div className="mb-4 text-[11px] text-zinc-500">
                AST Decomposition &amp; Deterministic Code Synthesis
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                {coreLayers.map((layer) => (
                  <div
                    key={layer.label}
                    className={`rounded border border-white/[0.06] bg-brand-dark p-2 ${layer.cls}`}
                  >
                    {layer.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="h-6 w-[1px] bg-white/[0.15]" />

            {/* Output stages */}
            <div className="grid w-full max-w-2xl grid-cols-1 gap-4 text-xs sm:grid-cols-3">
              {outputStages.map((out) => (
                <div
                  key={out.stage}
                  className={`rounded bg-brand-surface-muted border p-3 ${out.cls}`}
                >
                  <div className={`text-[10px] ${out.stageCls}`}>
                    {out.stage}
                  </div>
                  <div className="font-medium text-zinc-100">{out.name}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </FadeIn>
    </section>
  );
}

import { FadeIn } from "@/components/landing/fade-in";
import { Card } from "@/components/ui/card";

const cliLines = [
  {
    text: "$ kairo build ./spec/product-prd.md",
    cls: "font-bold text-brand-cyan",
    prefix: true,
    lineCls: "text-zinc-100",
  },
  { text: "[spec] Parsing requirements... 100%", cls: "text-zinc-500" },
  { text: "[spec] Architecture & data model generated", cls: "text-zinc-500" },
  {
    text: "[generator] Synthesizing Next.js 14 application",
    cls: "text-brand-purple-light",
  },
  { text: "[database] PostgreSQL migration complete", cls: "text-emerald-400" },
  { text: "[test] 24/24 integration tests passed", cls: "text-emerald-400" },
  {
    text: "[agent] Production edge build ready",
    cls: "font-medium text-brand-cyan",
  },
];

export function TerminalSection() {
  return (
    <section className="mx-auto max-w-6xl border-t border-white/[0.06] px-6 py-20">
      <FadeIn>
        <Card className="gap-0 rounded-lg border-white/[0.08] bg-brand-surface p-6 font-mono-tech text-xs shadow-none">
          <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3 text-[11px] text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="text-zinc-100">CLI EXECUTION — kairo</span>
            </div>
            <span>BASH</span>
          </div>
          <div className="space-y-1.5 text-[12px] leading-relaxed">
            {cliLines.map((line) => (
              <div key={line.text} className={line.lineCls ?? line.cls}>
                {line.prefix && (
                  <span className="font-bold text-brand-cyan">$ </span>
                )}
                <span className={line.prefix ? undefined : line.cls}>
                  {line.text}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </FadeIn>
    </section>
  );
}

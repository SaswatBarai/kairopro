import type { ReactNode } from "react";
import { Database, Info, ShieldCheck, Wand2, Zap } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";

function CodeRef({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[2px] bg-brand-cyan/10 px-1 py-px font-mono-tech text-[11px] text-brand-cyan">
      {children}
    </code>
  );
}

const DECISIONS: {
  tag: string;
  tagClass: string;
  icon: typeof ShieldCheck;
  title: string;
  body: ReactNode;
  file: string;
  note: string;
}[] = [
  {
    tag: "Security & Simplicity",
    tagClass: "bg-brand-purple-light/10 text-brand-purple-light",
    icon: ShieldCheck,
    title: "Cookie Sessions with JWT Fallback",
    body: "Replaced third-party external OAuth callback roundtrips with self-contained direct NextAuth JWT sessions to avoid dependency blockers during initial isolated staging.",
    file: "src/lib/auth.ts:24",
    note: "Overrode Spec",
  },
  {
    tag: "Schema Optimization",
    tagClass: "bg-brand-green/10 text-brand-green",
    icon: Database,
    title: "Subtask Nesting Capped to 1 Level",
    body: "PRD outlined recursive infinite nesting; agent constrained hierarchy to direct parent-child relation to prevent unbounded SQL recursive joins and complex client re-renders.",
    file: "prisma/schema.prisma:42",
    note: "Bounded Join",
  },
  {
    tag: "Performance Guard",
    tagClass: "bg-brand-cyan/10 text-brand-cyan",
    icon: Zap,
    title: "In-Memory Cache for Workspace RBAC",
    body: (
      <>
        Injected React <CodeRef>cache()</CodeRef> and Next.js{" "}
        <CodeRef>unstable_cache</CodeRef> wrappers for RBAC verification checks,
        eliminating redundant DB query overhead per route navigation by 85%.
      </>
    ),
    file: "src/server/queries/members.ts:18",
    note: "-85% Queries",
  },
];

export function AgentDecisions() {
  return (
    <FadeIn>
      <section className="flex flex-col gap-4 rounded-lg border border-white/[0.08] bg-brand-surface-muted p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
                Agent Decisions &amp; Simplified Implementations
              </h2>
              <div className="flex items-center gap-1 rounded-full bg-brand-cyan/10 px-2 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-cyan">
                <Wand2 className="h-3 w-3" />
                <span>3 automatic adaptations</span>
              </div>
            </div>
            <p className="max-w-2xl text-[13px] text-zinc-400">
              Review structural simplifications applied during autonomous
              synthesis to safeguard delivery timeframes and eliminate
              unconstrained latency.
            </p>
          </div>
          <div className="flex items-center gap-1 font-mono-tech text-[11px] text-zinc-500">
            <Info className="h-4 w-4" />
            <span>Configurable in .kairorc.json</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {DECISIONS.map((decision) => (
            <div
              className="flex flex-col justify-between gap-3 rounded-lg bg-brand-surface p-3 transition-colors hover:bg-white/[0.05]"
              key={decision.title}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-[2px] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider ${decision.tagClass}`}
                  >
                    {decision.tag}
                  </span>
                  <decision.icon className="h-4 w-4 text-zinc-600" />
                </div>
                <h4 className="text-sm font-semibold leading-snug text-zinc-100">
                  {decision.title}
                </h4>
                <p className="text-xs leading-relaxed text-zinc-400">
                  {decision.body}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 font-mono-tech text-[11px]">
                <span className="cursor-pointer font-medium text-brand-purple-light hover:underline">
                  {decision.file}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-400">
                  {decision.note}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}

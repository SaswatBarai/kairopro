import { FadeIn } from "@/components/landing/fade-in";
import { SectionHeading } from "@/components/landing/section-heading";

const flow = [
  { label: "BUILD", cls: "font-medium text-white" },
  { label: "RUN", cls: "font-medium text-white" },
  { label: "FAIL", cls: "rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 font-semibold text-rose-400" },
  { label: "PATCH", cls: "font-medium text-brand-cyan" },
  { label: "TEST", cls: "font-medium text-emerald-400" },
  { label: "SHIP", cls: "font-semibold text-brand-purple" },
];

const timeline = [
  {
    step: "01 // EXECUTION FAIL",
    badge: "401",
    badgeCls: "bg-rose-500/20 text-rose-300",
    headingCls: "text-rose-400",
    title: "[ERR_AUTH_REDIRECT]",
    detail:
      "Route test GET /api/tasks returned 401 Unauthorized during synthetic suite run.",
    borderCls: "border-rose-500/30",
  },
  {
    step: "02 // DIAGNOSE",
    badge: "AST PARSE",
    badgeCls: "text-zinc-500",
    headingCls: "text-brand-cyan",
    title: "Missing session context",
    detail:
      "Agent identified missing Bearer token validator inside Next.js edge middleware.",
    borderCls: "border-brand-cyan/30",
  },
  {
    step: "03 // APPLY PATCH",
    badge: "+14 / -2",
    badgeCls: "text-emerald-400",
    headingCls: "text-brand-purple-light",
    title: "Synthesized Diff",
    detail:
      "Appended getServerSession guard and token decoding pipeline directly to AST.",
    borderCls: "border-brand-purple/40",
  },
  {
    step: "04 // SHIP VERIFIED",
    badge: "PASSED",
    badgeCls: "text-emerald-400",
    headingCls: "text-emerald-400",
    title: "24/24 Assertions Green",
    detail:
      "Suite re-executed in 18ms. Clean production artifact ready for deployment.",
    borderCls: "border-emerald-500/40",
  },
];

export function SelfHealing() {
  return (
    <section className="mx-auto max-w-6xl border-t border-white/[0.06] px-6 py-24">
      <FadeIn>
        <SectionHeading
          align="center"
          eyebrow="AUTONOMOUS RECOVERY"
          eyebrowClassName="text-rose-400"
          title={
            <>
              IT DOESN&apos;T STOP WHEN THE CODE IS GENERATED.
            </>
          }
          description="LLMs produce flaws on first passes. KairoPro acts like a senior engineer: runs the code in a sandbox, catches compilation errors, reads the stack traces, and patches the AST until tests pass."
        />
      </FadeIn>

      {/* Flow ticker bar */}
      <FadeIn delay={0.1}>
        <div className="mb-12 flex flex-wrap items-center justify-center gap-3 rounded border border-white/[0.08] bg-brand-surface px-6 py-3 font-mono-tech text-xs tracking-wider text-zinc-400 sm:gap-6">
          {flow.map((item, i) => (
            <span key={item.label} className="flex items-center gap-3 sm:gap-6">
              {i > 0 && <span className="text-zinc-600">→</span>}
              <span className={item.cls}>{item.label}</span>
            </span>
          ))}
        </div>
      </FadeIn>

      {/* Timeline progression demo */}
      <FadeIn delay={0.15}>
        <div className="rounded-lg border border-white/[0.08] bg-brand-surface p-6 font-mono-tech text-xs sm:p-8">
          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-4">
            {timeline.map((item) => (
              <div
                key={item.step}
                className={`rounded border bg-brand-surface-muted p-4 ${item.borderCls}`}
              >
                <div
                  className={`mb-2 flex items-center justify-between text-[11px] font-semibold ${item.headingCls}`}
                >
                  <span>{item.step}</span>
                  <span className={item.badgeCls}>{item.badge}</span>
                </div>
                <div className="mb-1 text-xs font-medium text-zinc-100">
                  {item.title}
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

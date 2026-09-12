import { FadeIn } from "@/components/landing/fade-in";
import { SectionHeading } from "@/components/landing/section-heading";

const principles = [
  {
    index: "01 // SPEC-FIRST",
    indexCls: "text-brand-purple",
    title: "Approve artifacts before synthesis",
    detail:
      "You approve three clear contracts before a single line of application code is generated: Prisma schema, OpenAPI REST routes, and file architecture tree. No black boxes.",
  },
  {
    index: "02 // REAL CODE",
    indexCls: "text-brand-cyan",
    title: "Standard idiomatic TypeScript",
    detail:
      "Clean Next.js 14 App Router, PostgreSQL, Prisma, Tailwind CSS, and NextAuth. Zero proprietary abstractions, runtime lock-ins, or bloated wrapper libraries.",
  },
  {
    index: "03 // SELF-HEALING",
    indexCls: "text-emerald-400",
    title: "Build · Observe · Patch · Verify",
    detail:
      "The supervisor runs test suites in isolated sandbox MicroVMs. When tests fail or TypeScript complains, the AST engine analyzes the stack traces and fixes itself.",
  },
  {
    index: "04 // YOUR REPOSITORY",
    indexCls: "text-brand-purple-light",
    title: "Zero vendor lock-in",
    detail:
      "Full Git export to your GitHub organization with atomic commit histories, branch isolation, clean pull request descriptions, and Vitest test fixtures.",
  },
];

export function Principles() {
  return (
    <section
      id="principles"
      className="mx-auto max-w-6xl border-t border-white/[0.06] px-6 py-24"
    >
      <FadeIn>
        <SectionHeading eyebrow="CORE TENETS" title="Engineering principles." />
      </FadeIn>

      {/* Full width numbered list with hairline dividers */}
      <FadeIn delay={0.1}>
        <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {principles.map((p) => (
            <div
              key={p.index}
              className="grid grid-cols-1 items-baseline gap-4 py-8 md:grid-cols-12"
            >
              <div
                className={`font-mono-tech text-xs font-semibold md:col-span-2 ${p.indexCls}`}
              >
                {p.index}
              </div>
              <div className="text-lg font-medium text-zinc-100 md:col-span-4">
                {p.title}
              </div>
              <div className="text-sm leading-relaxed text-zinc-400 md:col-span-6">
                {p.detail}
              </div>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}

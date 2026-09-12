import { FadeIn } from "@/components/landing/fade-in";
import { SectionHeading } from "@/components/landing/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const checkpoints = [
  {
    state: "done" as const,
    title: "Parsed specification",
    detail: "14 models, 6 relational schemas mapped",
  },
  {
    state: "done" as const,
    title: "Generated schema",
    detail: "Prisma PostgreSQL v15 migration verified",
  },
  {
    state: "done" as const,
    title: "Created API",
    detail: "Next.js 14 App Router, zod validated",
  },
  {
    state: "running" as const,
    title: "Running tests",
    detail: "Vitest integration test suite (24/24)",
  },
  {
    state: "waiting" as const,
    title: "Production deployment",
    detail: "Edge artifact readiness check",
  },
];

const streamLines = [
  {
    n: "01",
    text: "[agent] initializing microvm sandbox container... ok",
    cls: "text-zinc-500",
  },
  {
    n: "02",
    text: "[spec] parsed requirements from manifest: 100% match",
    cls: "text-zinc-500",
  },
  {
    n: "03",
    text: "[agent] analyzing route /api/tasks/route.ts",
    cls: "text-zinc-100",
    tag: "[agent]",
    tagCls: "text-brand-cyan",
  },
  {
    n: "04",
    text: "[patch] authorization guard added (RBAC enforce)",
    cls: "text-zinc-100",
    tag: "[patch]",
    tagCls: "text-brand-purple-light",
  },
  {
    n: "05",
    text: "[test] 24 passed (0 failed, 48ms)",
    cls: "text-brand-green",
  },
  {
    n: "06",
    text: "[deploy] production ready: artifact v2.4.1",
    cls: "font-medium text-emerald-400",
  },
  {
    n: "07",
    text: "[agent] awaiting user checkout or export to github...",
    cls: "text-brand-cyan",
    caret: true,
  },
];

export function AgentRuntime() {
  return (
    <section className="mx-auto max-w-6xl border-t border-white/[0.06] px-6 py-20">
      <FadeIn>
        <SectionHeading
          eyebrow="SUPERVISED EXECUTION"
          eyebrowClassName="text-brand-cyan"
          title="Agent Runtime Supervisor"
          description="Autonomous orchestration with deterministic checkpoint guarantees."
        />
      </FadeIn>

      {/* Single large unified developer console */}
      <FadeIn delay={0.1}>
        <Card className="gap-0 overflow-hidden rounded-lg border-white/[0.08] bg-brand-surface py-0 shadow-none">
          {/* Console bar */}
          <div className="flex h-10 items-center justify-between border-b border-white/[0.06] bg-brand-surface-muted px-5 font-mono-tech text-xs">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-purple" />
              <span className="font-medium tracking-tight text-zinc-100">
                KAIRO AGENT // RUNTIME SUPERVISOR
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-zinc-500">SANDBOX #sandbox_081a</span>
              <Badge variant="green" mono>
                ALL PASSING
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-12">
            {/* Left: live checklist */}
            <div className="space-y-3 font-mono-tech text-xs lg:col-span-5">
              <div className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">
                Deterministic Checkpoints
              </div>
              {checkpoints.map((cp) => (
                <div
                  key={cp.title}
                  className={
                    cp.state === "running"
                      ? "flex items-start gap-3 rounded border border-brand-cyan/40 bg-brand-surface-muted p-2.5"
                      : cp.state === "done"
                        ? "flex items-start gap-3 rounded border border-white/[0.04] bg-brand-surface-muted/70 p-2.5"
                        : "flex items-start gap-3 rounded border border-white/[0.03] bg-brand-surface-muted/30 p-2.5 opacity-60"
                  }
                >
                  <span
                    className={
                      cp.state === "running"
                        ? "animate-pulse text-sm text-brand-cyan"
                        : cp.state === "done"
                          ? "text-sm text-brand-green"
                          : "text-sm text-zinc-500"
                    }
                  >
                    {cp.state === "running"
                      ? "●"
                      : cp.state === "done"
                        ? "✓"
                        : "○"}
                  </span>
                  <div>
                    <div
                      className={
                        cp.state === "running"
                          ? "font-medium text-brand-cyan"
                          : cp.state === "done"
                            ? "font-medium text-zinc-100"
                            : "text-zinc-400"
                      }
                    >
                      {cp.title}
                    </div>
                    <div
                      className={
                        cp.state === "running"
                          ? "text-[11px] text-zinc-400"
                          : "text-[11px] text-zinc-500"
                      }
                    >
                      {cp.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: terminal output */}
            <div className="flex flex-col justify-between rounded border border-white/[0.06] bg-brand-dark p-4 font-mono-tech text-xs lg:col-span-7">
              <div>
                <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-2 text-[10px] text-zinc-500">
                  <span>AGENT EXECUTION STREAM (STDOUT)</span>
                  <span>LEVEL: VERBOSE</span>
                </div>
                <div className="space-y-1.5 text-[11.5px] leading-relaxed">
                  {streamLines.map((line) => (
                    <div key={line.n} className={line.cls}>
                      <span className="text-white/30">{line.n}</span>{" "}
                      {line.tag ? (
                        <>
                          <span className={line.tagCls}>{line.tag}</span>{" "}
                        </>
                      ) : null}
                      {line.text}
                      {line.caret && (
                        <span className="ml-1.5 inline-block h-3 w-1.5 animate-pulse bg-brand-cyan" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Separator className="mb-3 bg-white/[0.05]" />
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>PID: 10429</span>
                  <span>MEMORY: 248MB / 1024MB</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </FadeIn>
    </section>
  );
}

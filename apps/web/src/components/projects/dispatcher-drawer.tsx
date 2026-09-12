import { Terminal } from "lucide-react";

const DISPATCH_LINES = [
  {
    time: "14:02:18",
    tag: "[orchestrator]",
    tone: "text-zinc-400",
    message: (
      <>
        Re-indexed repository registry for workspace{" "}
        <span className="text-zinc-100">&apos;kairo-core&apos;</span>. Found 4
        targets.
      </>
    ),
  },
  {
    time: "14:03:02",
    tag: "[runner-04]",
    tone: "text-zinc-400",
    message: (
      <>
        Initialized agent workflow for{" "}
        <span className="text-zinc-100">&apos;Booking System&apos;</span>.
        Synthesizing Prisma schema.
      </>
    ),
  },
  {
    time: "14:04:11",
    tag: "[runner-04:step-3]",
    tone: "text-brand-cyan",
    message: (
      <>Generating Express router controllers. Token usage: 4.8k tokens.</>
    ),
  },
];

export function DispatcherDrawer() {
  return (
    <div className="mt-4 w-full overflow-hidden rounded-[3px] border border-white/[0.06] bg-brand-surface">
      <div className="flex h-8 items-center justify-between border-b border-white/[0.06] bg-brand-surface-muted px-3 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-400">
        <div className="flex items-center gap-2">
          <Terminal className="h-[15px] w-[15px] text-zinc-500" />
          <span>Background Agent Dispatcher</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 normal-case text-brand-green">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
            Socket connected (us-east-1)
          </span>
          <span className="normal-case text-zinc-500">latency: 18ms</span>
        </div>
      </div>
      <div className="overflow-x-auto bg-brand-dark p-3 font-mono-tech text-[11px] leading-relaxed text-zinc-500">
        {DISPATCH_LINES.map((line) => (
          <div className="flex gap-3" key={line.time}>
            <span className="select-none text-zinc-600">{line.time}</span>
            <span className={line.tone}>
              {line.tag} {line.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

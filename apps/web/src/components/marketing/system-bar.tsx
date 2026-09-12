import { Badge } from "@/components/ui/badge";

export function SystemBar() {
  return (
    <div className="flex w-full items-center justify-between border-b border-white/[0.06] bg-brand-surface px-6 py-1.5">
      <div className="flex items-center gap-2.5 font-mono-tech text-[10px] uppercase tracking-wide text-zinc-500">
        <span className="flex items-center gap-1.5 text-brand-cyan">
          <span className="h-1.5 w-1.5 animate-pulse-cyan rounded-full bg-brand-cyan" />
          Pipeline Runner v2.4.9-stable
        </span>
        <span aria-hidden="true" className="text-zinc-700">
          /
        </span>
        <span>Env: sandbox-prov-isolated</span>
        <span aria-hidden="true" className="hidden text-zinc-700 sm:inline">
          /
        </span>
        <span className="hidden sm:inline">Latency: 14ms</span>
      </div>
      <div className="hidden items-center gap-3 font-mono-tech text-[10px] uppercase tracking-wide text-zinc-500 sm:flex">
        <span>Autonomous agent active</span>
        <Badge variant="secondary" mono className="text-zinc-300">
          Branch: main@8f29ea
        </Badge>
      </div>
    </div>
  );
}

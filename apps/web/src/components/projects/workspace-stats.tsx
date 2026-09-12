import type { LucideIcon } from "lucide-react";
import { CloudCheck, Folders, GitBranch } from "lucide-react";

interface StatCard {
  icon: LucideIcon;
  iconClass: string;
  value: string;
  label: string;
  note: React.ReactNode;
  noteClass?: string;
}

const STATS: StatCard[] = [
  {
    icon: Folders,
    iconClass: "text-zinc-400",
    value: "3 active",
    label: "Total Projects",
    note: "4 total",
  },
  {
    icon: CloudCheck,
    iconClass: "text-brand-green",
    value: "1 deployed",
    label: "Production Status",
    note: (
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
        100% healthy
      </span>
    ),
    noteClass: "text-brand-green",
  },
  {
    icon: GitBranch,
    iconClass: "text-zinc-400",
    value: "2 previews",
    label: "Ephemeral Envs",
    note: "auto-routed",
  },
];

export function WorkspaceStats() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {STATS.map((stat) => (
        <div
          className="flex items-center justify-between rounded-[3px] border border-white/[0.06] bg-brand-surface p-3"
          key={stat.label}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-brand-surface-muted">
              <stat.icon className={`h-[18px] w-[18px] ${stat.iconClass}`} />
            </div>
            <div>
              <div className="text-[15px] font-semibold text-zinc-100">
                {stat.value}
              </div>
              <div className="font-mono-tech text-[11px] uppercase tracking-wider text-zinc-400">
                {stat.label}
              </div>
            </div>
          </div>
          <span
            className={`font-mono-tech text-[11px] text-zinc-500 ${stat.noteClass ?? ""}`}
          >
            {stat.note}
          </span>
        </div>
      ))}
    </div>
  );
}

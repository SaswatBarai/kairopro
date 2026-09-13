import type { LucideIcon } from "lucide-react";
import { CloudCheck, Folders, GitBranch } from "lucide-react";

import type { Project } from "./project-card";

interface StatCard {
  icon: LucideIcon;
  iconClass: string;
  value: string;
  label: string;
  note: React.ReactNode;
  noteClass?: string;
}

function buildStats(projects: Project[]): StatCard[] {
  const active = projects.filter(
    (project) => project.bucket !== "draft",
  ).length;
  const deployed = projects.filter(
    (project) => project.status === "deployed",
  ).length;
  const building = projects.filter(
    (project) => project.status === "building",
  ).length;
  const previews = projects.filter(
    (project) => project.url !== undefined,
  ).length;

  return [
    {
      icon: Folders,
      iconClass: "text-zinc-400",
      value: `${active} active`,
      label: "Total Projects",
      note: `${projects.length} total`,
    },
    {
      icon: CloudCheck,
      iconClass: "text-brand-green",
      value: `${deployed} deployed`,
      label: "Production Status",
      note: (
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
          {building > 0 ? `${building} building` : "all stable"}
        </span>
      ),
      noteClass: "text-brand-green",
    },
    {
      icon: GitBranch,
      iconClass: "text-zinc-400",
      value: `${previews} previews`,
      label: "Ephemeral Envs",
      note: "auto-routed",
    },
  ];
}

export function WorkspaceStats({ projects }: { projects: Project[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {buildStats(projects).map((stat) => (
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

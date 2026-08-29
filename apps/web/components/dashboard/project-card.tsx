"use client";

import Link from "next/link";
import { ProjectData } from "@/lib/projects";
import { Clock, Folder, Globe, ArrowRight, Trash2 } from "lucide-react";

interface ProjectCardProps {
  project: ProjectData;
  onDelete?: (id: string) => void;
}

const stateColors: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-slate-800", text: "text-slate-300", label: "Draft" },
  analyzing: { bg: "bg-amber-950/60 border-amber-800", text: "text-amber-400", label: "Analyzing" },
  clarification: { bg: "bg-purple-950/60 border-purple-800", text: "text-purple-400", label: "Clarifying" },
  prd_ready: { bg: "bg-blue-950/60 border-blue-800", text: "text-blue-400", label: "PRD Ready" },
  designing: { bg: "bg-pink-950/60 border-pink-800", text: "text-pink-400", label: "Designing" },
  architecture_ready: { bg: "bg-cyan-950/60 border-cyan-800", text: "text-cyan-400", label: "Arch Ready" },
  approved: { bg: "bg-emerald-950/60 border-emerald-800", text: "text-emerald-400", label: "Approved" },
  developing: { bg: "bg-indigo-950/60 border-indigo-800 animate-pulse", text: "text-indigo-400", label: "Developing" },
  testing: { bg: "bg-violet-950/60 border-violet-800", text: "text-violet-400", label: "Testing" },
  preview: { bg: "bg-teal-950/60 border-teal-800", text: "text-teal-400", label: "Preview" },
  live: { bg: "bg-emerald-900/40 border-emerald-700", text: "text-emerald-300", label: "Live" },
  failed: { bg: "bg-red-950/60 border-red-800", text: "text-red-400", label: "Failed" },
};

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const status = stateColors[project.state] || stateColors.draft;
  const timeAgo = new Date(project.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="group relative bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between shadow-lg">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.bg} ${status.text}`}
          >
            {status.label}
          </span>

          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
                  onDelete(project.id);
                }
              }}
              className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
            {project.name}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-2 mt-1 min-h-[32px]">
            {project.description || "No description provided."}
          </p>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{timeAgo}</span>
        </div>

        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
        >
          Open IDE <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

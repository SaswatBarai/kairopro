"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Check,
  Copy,
  Ellipsis,
  ExternalLink,
  Play,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type ProjectStatus = "deployed" | "ready" | "building" | "draft";

export interface Project {
  name: string;
  icon: LucideIcon;
  iconClass: string;
  status: ProjectStatus;
  bucket: "active" | "building" | "draft";
  preview: ReactNode;
  activityValue: string;
  url?: { display: string; full: string };
  href?: string;
  agentStep?: string;
  worker?: string;
  architect?: string;
  stack?: string;
  footerRef: string;
}

const STATUS_BADGES: Record<
  ProjectStatus,
  { label: string; dotClass?: string; className: string }
> = {
  deployed: {
    label: "Deployed",
    dotClass: "bg-brand-green",
    className: "border-brand-green/30 bg-brand-green/10 text-brand-green",
  },
  ready: {
    label: "Ready",
    dotClass: "bg-brand-green",
    className: "border-brand-green/30 bg-brand-green/10 text-brand-green",
  },
  building: {
    label: "Building",
    dotClass: "animate-pulse bg-brand-cyan",
    className: "border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan",
  },
  draft: {
    label: "Draft",
    className: "border-white/[0.1] bg-white/[0.05] text-zinc-400",
  },
};

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex-shrink-0 text-zinc-500">{label}</span>
      {children}
    </div>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const badge = STATUS_BADGES[project.status];
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    if (!project.url) return;
    void navigator.clipboard?.writeText(`https://${project.url?.full}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-[3px] border bg-brand-surface transition-colors",
        project.status === "building"
          ? "border-brand-cyan/40 hover:border-brand-cyan/70"
          : "border-white/[0.08] hover:border-white/[0.15]",
      )}
    >
      {project.status === "building" && (
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-brand-cyan" />
      )}

      <div>
        <div className="flex items-center justify-between border-b border-white/[0.06] p-3">
          <div className="flex items-center gap-2">
            <project.icon
              className={cn("h-[18px] w-[18px]", project.iconClass)}
            />
            <h2 className="text-[15px] font-semibold tracking-tight text-zinc-100">
              {project.href ? (
                <Link
                  href={project.href}
                  className="transition-colors hover:text-brand-purple-light"
                >
                  {project.name}
                </Link>
              ) : (
                project.name
              )}
            </h2>
          </div>
          <div
            className={cn(
              "flex h-5 items-center gap-1 rounded-[3px] px-1.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider",
              badge.className,
            )}
          >
            {badge.dotClass && (
              <span
                className={cn("h-1.5 w-1.5 rounded-full", badge.dotClass)}
              />
            )}
            <span>{badge.label}</span>
          </div>
        </div>

        <div className="p-3">{project.preview}</div>

        <div className="flex flex-col gap-1.5 px-3 pb-3 font-mono-tech text-[11px] text-zinc-400">
          <MetaRow label="Activity">
            <span className="text-zinc-100">{project.activityValue}</span>
          </MetaRow>

          {project.url && (
            <MetaRow label="URL">
              <a
                className="flex max-w-[200px] cursor-pointer items-center gap-1 truncate text-brand-purple-light hover:underline"
                href="#"
              >
                <span className="truncate">{project.url.display}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </MetaRow>
          )}

          {project.agentStep && (
            <MetaRow label="Agent step">
              <span className="max-w-[200px] truncate text-brand-cyan">
                {project.agentStep}
              </span>
            </MetaRow>
          )}

          {project.worker && (
            <MetaRow label="Worker">
              <span className="rounded-[2px] border border-white/[0.08] bg-brand-surface-muted px-1.5 py-0.5 text-[10px] text-zinc-400">
                {project.worker}
              </span>
            </MetaRow>
          )}

          {project.architect && (
            <MetaRow label="Architect">
              <span className="text-zinc-100">{project.architect}</span>
            </MetaRow>
          )}

          {project.stack && (
            <MetaRow label="Stack">
              <span className="rounded-[2px] border border-white/[0.08] bg-brand-surface-muted px-1.5 py-0.5 text-[10px] text-zinc-400">
                {project.stack}
              </span>
            </MetaRow>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.06] bg-brand-surface p-2">
        {project.status === "building" ? (
          <>
            <span className="flex items-center gap-1 px-1 font-mono-tech text-[10px] text-brand-cyan">
              <span className="h-1 w-1 rounded-full bg-brand-cyan" />
              Streaming logs
            </span>
            <button
              className="flex h-7 cursor-pointer items-center gap-1 rounded-[3px] border border-brand-cyan/30 bg-brand-surface-muted px-2 text-xs text-brand-cyan transition-colors hover:bg-white/[0.08]"
              type="button"
              onClick={() => router.push("/projects/new/build")}
            >
              <span>View live build</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </>
        ) : project.status === "draft" ? (
          <>
            <span className="px-1 font-mono-tech text-[10px] text-zinc-500">
              {project.footerRef}
            </span>
            <button
              className="flex h-7 cursor-pointer items-center gap-1.5 rounded-[3px] border border-white/[0.1] bg-brand-surface-muted px-3 text-xs text-zinc-100 transition-colors hover:bg-white/[0.08]"
              type="button"
              onClick={() => router.push("/projects/new")}
            >
              <Play className="h-3.5 w-3.5 text-zinc-500" />
              <span>Continue setup</span>
            </button>
          </>
        ) : (
          <>
            <span className="px-1 font-mono-tech text-[10px] text-zinc-500">
              {project.footerRef}
            </span>
            <div className="flex items-center gap-1">
              <button
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[3px] text-zinc-400 transition-colors hover:bg-brand-surface-muted hover:text-zinc-100"
                title="Open app"
                type="button"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
              <button
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[3px] text-zinc-400 transition-colors hover:bg-brand-surface-muted hover:text-zinc-100"
                title="Copy URL"
                type="button"
                onClick={copyUrl}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-brand-green" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <button
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[3px] text-zinc-400 transition-colors hover:bg-brand-surface-muted hover:text-zinc-100"
                title="More options"
                type="button"
              >
                <Ellipsis className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { DispatcherDrawer } from "./dispatcher-drawer";
import { ProjectCard } from "./project-card";
import type { Project } from "./project-card";
import { WorkspaceStats } from "./workspace-stats";

const FILTERS = [
  { id: "all", label: "All", bucket: null },
  { id: "active", label: "Active", bucket: "active" },
  { id: "building", label: "Building", bucket: "building" },
  { id: "draft", label: "Drafts", bucket: "draft" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

interface ProjectsListingProps {
  projects: Project[];
  onNewProject: () => void;
}

export function ProjectsListing({
  projects,
  onNewProject,
}: ProjectsListingProps) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = FILTERS.map((item) => ({
    ...item,
    count: item.bucket
      ? projects.filter((project) => project.bucket === item.bucket).length
      : projects.length,
  }));

  const visibleProjects = projects.filter((project) => {
    const activeFilter = FILTERS.find((item) => item.id === filter);
    const matchesFilter =
      filter === "all" || project.bucket === activeFilter?.bucket;
    const matchesQuery = project.name
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <>
      <section className="flex flex-shrink-0 flex-col items-start justify-between gap-3 border-b border-white/[0.06] bg-brand-surface px-6 py-3 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              Projects
            </h1>
            <span className="font-mono-tech text-[11px] font-medium text-zinc-400">
              Workspace: kairo-core
            </span>
          </div>
          <div className="hidden items-center gap-1 border-l border-white/[0.08] pl-4 lg:flex">
            {counts.map((item) => (
              <button
                className={cn(
                  "cursor-pointer rounded-[3px] px-2 py-[3px] text-xs transition-colors",
                  filter === item.id
                    ? "bg-brand-surface-muted text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-100",
                )}
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end">
          <div className="relative flex-1 md:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              className="h-8 w-full rounded-[3px] border border-white/[0.08] bg-brand-dark pl-8 pr-12 font-mono-tech text-xs text-zinc-100 transition-colors placeholder:text-zinc-500 focus:border-brand-purple focus:outline-none"
              placeholder="Filter projects..."
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none rounded-[2px] border border-white/[0.08] bg-brand-surface px-1 py-0.5 font-mono-tech text-[10px] text-zinc-500">
              ⌘K
            </kbd>
          </div>
          <Button
            className="h-8 gap-1.5 whitespace-nowrap px-3 text-[13px]"
            onClick={onNewProject}
          >
            <Plus className="h-4 w-4" />
            <span>New project</span>
          </Button>
          <div className="flex h-8 w-8 select-none items-center justify-center rounded-[3px] border border-white/[0.08] bg-brand-surface-muted font-mono-tech text-xs font-semibold text-brand-purple-light">
            PW
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-6">
        <FadeIn>
          <WorkspaceStats />
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono-tech text-[11px] uppercase tracking-wider text-zinc-400">
                Repositories &amp; Agent Workspaces
              </span>
              <span className="text-[10px] text-zinc-500">•</span>
              <span className="font-mono-tech text-[11px] text-zinc-500">
                Synced to GitHub
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono-tech text-[11px] text-zinc-500">
              <span>Sort by:</span>
              <span className="cursor-pointer text-zinc-100 hover:underline">
                Recent activity ↓
              </span>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project, index) => (
            <FadeIn delay={0.08 + index * 0.05} key={project.name}>
              <ProjectCard project={project} />
            </FadeIn>
          ))}
        </div>

        {visibleProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[3px] border border-dashed border-white/[0.08] bg-brand-surface p-10 text-center">
            <span className="text-sm font-medium text-zinc-400">
              No projects match your filters
            </span>
            <span className="mt-1 font-mono-tech text-[11px] text-zinc-500">
              Adjust the search query or switch filter tabs.
            </span>
          </div>
        )}

        <FadeIn delay={0.15}>
          <DispatcherDrawer />
        </FadeIn>
      </div>
    </>
  );
}

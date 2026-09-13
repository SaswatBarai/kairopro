"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Boxes,
  Code2,
  FileText,
  Folder,
  LayoutDashboard,
  Lock,
  Monitor,
  Plus,
  Settings,
  Terminal,
} from "lucide-react";

import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createProjectFromSpec,
  SEED_PROJECTS,
} from "@/components/projects/demo-projects";
import type { Project } from "@/components/projects/project-card";
import { ProjectsListing } from "@/components/projects/projects-listing";
import { useAuthStore } from "@/stores/use-auth-store";
import { useProjectStore } from "@/stores/use-project-store";

const sampleSpecs: Record<string, { title: string; body: string }> = {
  "task-manager": {
    title: "task-flow-engine",
    body: "Build a keyboard-driven task manager supporting Kanban pipelines, markdown-based issue descriptions, and optimistic local storage persistence.",
  },
  "saas-billing": {
    title: "stripe-metered-billing",
    body: "Implement auth session management via JWT, tier gating (Starter, Pro, Enterprise), and Stripe metered usage webhook ingestion.",
  },
  "internal-tool": {
    title: "ops-admin-portal",
    body: "A high-density operational dashboard featuring service health check tables, Postgres read replicas visualizer, and roll-back triggers.",
  },
};

const flowNodes = [
  { icon: FileText, step: "01. PRD", label: "Define intent" },
  { icon: Code2, step: "02. BUILD", label: "Code engine" },
  { icon: Monitor, step: "03. PREVIEW", label: "Inspect & run" },
];

export function ProjectsDashboard() {
  const { userName, activeOrgName } = useAuthStore();
  const { setActiveProject } = useProjectStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [spec, setSpec] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openModal = useCallback((name = "", specBody = "") => {
    setProjectName(name);
    setSpec(specBody);
    setOpen(true);
  }, []);

  // ⌘K / Ctrl+K opens the project spec dialog while the workspace is empty;
  // once projects exist the listing binds ⌘K to its search field instead.
  useEffect(() => {
    if (projects.length > 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openModal, projects.length]);

  function handleCreate() {
    setSubmitting(true);
    setTimeout(() => {
      setProjects((prev) => [...prev, createProjectFromSpec(projectName)]);
      setSubmitting(false);
      setOpen(false);
    }, 600);
  }

  const isEmpty = projects.length === 0;

  const sideNav = [
    {
      icon: Folder,
      label: "Projects",
      count: isEmpty ? null : String(projects.length),
      active: true,
    },
    { icon: Boxes, label: "Deployments", count: null, active: false },
    { icon: Settings, label: "Settings", count: null, active: false },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-brand-dark">
      <div className="flex h-[calc(100vh-0px)] w-full overflow-hidden">
        {/* Left navigation rail */}
        <aside className="flex w-60 flex-shrink-0 select-none flex-col justify-between border-r border-white/[0.08] bg-brand-surface">
          <div className="flex flex-col gap-3 p-3">
            <Button
              className="w-full justify-center font-medium"
              onClick={() => openModal()}
            >
              <Plus className="h-4 w-4" />
              New project
            </Button>
            <nav
              aria-label="Main sidebar"
              className="mt-1 flex flex-col gap-0.5"
            >
              {sideNav.map((item) => (
                <a
                  key={item.label}
                  href="#"
                  className={
                    item.active
                      ? "flex items-center gap-2.5 rounded-sm bg-brand-surface-muted px-2.5 py-1.5 text-sm font-medium text-zinc-100"
                      : "flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-brand-surface-muted/60 hover:text-zinc-100"
                  }
                >
                  <item.icon
                    className={
                      item.active
                        ? "h-4.5 w-4.5 text-brand-purple"
                        : "h-4.5 w-4.5"
                    }
                  />
                  <span>{item.label}</span>
                  {item.count ? (
                    <Badge
                      variant="outline"
                      mono
                      className="ml-auto border-white/[0.08] text-zinc-500"
                    >
                      {item.count}
                    </Badge>
                  ) : null}
                </a>
              ))}
            </nav>

            <div className="mt-2 flex flex-col gap-1 rounded-sm border border-dashed border-white/[0.06] p-2">
              <span className="px-1 font-mono-tech text-[9px] uppercase tracking-widest text-zinc-600">
                Demo state
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setProjects([])}
                  className={
                    isEmpty
                      ? "flex-1 cursor-pointer rounded-sm bg-brand-surface-muted px-2 py-1 font-mono-tech text-[10px] text-zinc-200"
                      : "flex-1 cursor-pointer rounded-sm px-2 py-1 font-mono-tech text-[10px] text-zinc-500 transition-colors hover:text-zinc-200"
                  }
                >
                  Empty
                </button>
                <button
                  type="button"
                  onClick={() => setProjects(SEED_PROJECTS)}
                  className={
                    !isEmpty
                      ? "flex-1 cursor-pointer rounded-sm bg-brand-surface-muted px-2 py-1 font-mono-tech text-[10px] text-zinc-200"
                      : "flex-1 cursor-pointer rounded-sm px-2 py-1 font-mono-tech text-[10px] text-zinc-500 transition-colors hover:text-zinc-200"
                  }
                >
                  Seeded ×4
                </button>
              </div>
            </div>
          </div>

          {/* Workspace meta */}
          <div className="flex flex-col gap-1 border-t border-white/[0.06] p-3">
            <div className="flex items-center justify-between px-1 py-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-white/10 font-mono-tech text-[10px] text-zinc-400">
                  {userName
                    ? userName
                        .split(" ")
                        .map((w) => w[0]?.toUpperCase())
                        .join("")
                        .slice(0, 2)
                    : "PW"}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs text-zinc-200">
                    {activeOrgName || "Personal Workspace"}
                  </span>
                  <span className="font-mono-tech text-[10px] uppercase tracking-widest text-zinc-600">
                    Beta Pro
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main canvas */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {isEmpty ? (
            <>
              {/* Sub-header breadcrumb bar */}
              <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/[0.06] bg-brand-surface px-6">
                <div className="flex items-center gap-2">
                  <span className="font-mono-tech text-[11px] uppercase tracking-wider text-zinc-500">
                    Workspace
                  </span>
                  <span className="font-mono-tech text-[11px] text-zinc-700">
                    /
                  </span>
                  <h1 className="text-sm font-medium text-zinc-100">
                    Projects
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden items-center gap-1.5 rounded-sm border border-white/[0.08] bg-brand-dark px-2 py-1 font-mono-tech text-[11px] text-zinc-400 sm:flex">
                    <span className="text-zinc-600">CMD</span>
                    <span className="text-zinc-600">+</span>
                    <span className="text-zinc-600">K</span>
                    <span className="ml-1">Specs</span>
                  </div>
                  <a
                    className="flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-100"
                    href="#"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Docs</span>
                  </a>
                  <div className="h-3.5 w-px bg-white/[0.1]" />
                  <div className="flex h-6 w-6 items-center justify-center rounded-sm border border-brand-purple/40 bg-brand-purple/20 font-mono-tech text-[11px] font-medium text-brand-purple">
                    KP
                  </div>
                </div>
              </div>

              {/* Zero-state workflow */}
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
                <div className="flex w-full max-w-[580px] flex-col items-center text-center">
                  {/* Flow topology diagram */}
                  <div className="mb-8 w-full rounded-lg border border-white/[0.08] bg-brand-surface p-4">
                    <div className="flex w-full items-center justify-between gap-2">
                      {flowNodes.map((node, i) => (
                        <div
                          key={node.step}
                          className="flex flex-1 items-center"
                        >
                          <div className="flex flex-1 flex-col items-center rounded border border-white/[0.06] bg-brand-surface-muted p-2.5">
                            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded bg-brand-surface text-zinc-400">
                              <node.icon className="h-5 w-5" />
                            </div>
                            <span className="font-mono-tech text-[11px] uppercase tracking-wide text-zinc-200">
                              {node.step}
                            </span>
                            <span className="mt-0.5 font-mono-tech text-[10px] text-zinc-500">
                              {node.label}
                            </span>
                          </div>
                          {i < flowNodes.length - 1 && (
                            <ArrowRight className="h-4 w-4 flex-shrink-0 px-0.5 text-brand-purple" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
                    Create your first project
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                    Describe what you want to build, or upload a PRD. KairoPro
                    will plan it with you, then build and run it.
                  </p>

                  <div className="mt-6 flex w-full flex-col items-center">
                    <Button className="h-10 px-6" onClick={() => openModal()}>
                      <Plus className="h-4 w-4" />
                      New project
                    </Button>
                    <span className="mt-2 font-mono-tech text-[10px] text-zinc-600">
                      Free while in beta. No card required.
                    </span>
                  </div>

                  {/* Sample specs */}
                  <div className="mt-8 flex w-full flex-col items-center border-t border-white/[0.06] pt-4">
                    <span className="mb-2 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-600">
                      Or start from a sample spec
                    </span>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {[
                        {
                          key: "task-manager",
                          icon: FileText,
                          label: "Task manager PRD",
                        },
                        {
                          key: "saas-billing",
                          icon: Lock,
                          label: "SaaS billing & auth",
                        },
                        {
                          key: "internal-tool",
                          icon: LayoutDashboard,
                          label: "Internal tooling dashboard",
                        },
                      ].map((pill) => (
                        <button
                          key={pill.key}
                          type="button"
                          onClick={() => {
                            const data = sampleSpecs[pill.key];
                            if (!data) return;
                            openModal(data.title, data.body);
                          }}
                          className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-white/[0.08] bg-brand-surface px-2.5 py-1 font-mono-tech text-[11px] text-zinc-400 transition-colors hover:border-white/[0.2] hover:bg-brand-surface-muted hover:text-zinc-200"
                        >
                          <pill.icon className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{pill.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <ProjectsListing
              onNewProject={() => openModal()}
              projects={projects}
            />
          )}
        </div>
      </div>

      {/* New project dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-lg border-white/[0.1] bg-brand-surface-muted p-5 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono-tech text-sm font-medium text-zinc-100">
              <Terminal className="h-4 w-4 text-brand-purple" />
              Initiate Project Spec
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Describe the system you want KairoPro to plan, build, and run.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="project-name"
                className="font-mono-tech text-[11px] text-zinc-500"
              >
                Project Name
              </Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. telemetry-dashboard"
                className="border-white/[0.1] bg-brand-dark font-mono-tech text-xs text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-brand-purple/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="spec"
                className="font-mono-tech text-[11px] text-zinc-500"
              >
                Initial Requirements / Outline
              </Label>
              <Textarea
                id="spec"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                placeholder="Describe core entities, API routes, or copy-paste PRD contents..."
                rows={4}
                className="resize-none border-white/[0.1] bg-brand-dark font-mono-tech text-xs text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-brand-purple/40"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={submitting}>
                {submitting ? "Allocating node..." : "Create & Plan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

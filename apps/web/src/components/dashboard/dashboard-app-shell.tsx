"use client";

import { useCallback, useState } from "react";
import {
  ArrowLeft,
  Boxes,
  Folder,
  Plus,
  Settings,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { CreateProjectInputSchema } from "@kairopro/contracts";
import { useCreateProjectMutation } from "@/lib/queries/projects";
import { useAuthStore } from "@/stores/use-auth-store";

interface DashboardAppShellProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
  activeTab?: "projects" | "deployments" | "settings" | "new-project";
  projectCount?: number;
}

export function DashboardAppShell({
  children,
  title = "New Project",
  showBackButton = true,
  backHref = "/dashboard",
  backLabel = "Back to Projects",
  activeTab = "new-project",
  projectCount,
}: DashboardAppShellProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { userName, userEmail, activeOrgName } = useAuthStore();

  const displayName = userName || session?.user?.name || "Developer User";
  const displayEmail = userEmail || session?.user?.email || "user@kairopro.app";
  const userImage = session?.user?.image || null;
  const userInitials =
    displayName
      .split(" ")
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "DU";

  const createMutation = useCreateProjectMutation();
  const [modalOpen, setModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [spec, setSpec] = useState("");
  const submitting = createMutation.isPending;

  const openModal = useCallback((name = "", specBody = "") => {
    setProjectName(name);
    setSpec(specBody);
    setModalOpen(true);
  }, []);

  function handleCreate() {
    const parseResult = CreateProjectInputSchema.safeParse({
      name: projectName.trim(),
      description: spec.trim() || undefined,
    });
    if (!parseResult.success) return;
    createMutation.mutate(parseResult.data, {
      onSuccess: (newProject) => {
        setModalOpen(false);
        setProjectName("");
        setSpec("");
        if (newProject?.id) {
          router.push(`/projects/new?projectId=${newProject.id}`);
        }
      },
    });
  }

  const sideNav = [
    {
      id: "projects",
      icon: Folder,
      label: "Projects",
      count: projectCount !== undefined ? String(projectCount) : null,
      active: activeTab === "projects",
      href: "/dashboard",
    },
    {
      id: "deployments",
      icon: Boxes,
      label: "Deployments",
      count: null,
      active: activeTab === "deployments",
      href: "/dashboard?tab=deployments",
    },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      count: null,
      active: activeTab === "settings",
      href: "/dashboard?tab=settings",
    },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-brand-dark">
      <div className="flex h-screen w-full overflow-hidden">
        {/* Left navigation rail sidebar */}
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
                <button
                  key={item.label}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={
                    item.active
                      ? "flex w-full items-center gap-2.5 rounded-sm bg-brand-surface-muted px-2.5 py-1.5 text-sm font-medium text-zinc-100"
                      : "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-brand-surface-muted/60 hover:text-zinc-100"
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
                </button>
              ))}
            </nav>
          </div>

          {/* Bottom user profile card */}
          <div className="border-t border-white/[0.08] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-brand-purple via-brand-purple/70 to-brand-cyan text-xs font-bold text-white shadow-sm ring-1 ring-white/10">
                  {userImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userImage}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    userInitials
                  )}
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-brand-green ring-2 ring-brand-surface" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-semibold tracking-tight text-zinc-100">
                    {displayName}
                  </span>
                  <span className="truncate font-mono-tech text-[10px] text-zinc-400">
                    {displayEmail}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between rounded-sm bg-brand-dark px-2 py-1 font-mono-tech text-[10px]">
              <span className="truncate text-zinc-500">
                {activeOrgName || "Personal Org"}
              </span>
              <span className="shrink-0 rounded bg-brand-purple/20 px-1.5 py-0.5 font-semibold uppercase tracking-wider text-brand-purple-light">
                Pro
              </span>
            </div>
          </div>
        </aside>

        {/* Main canvas area inside sidebar shell */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top navigation & breadcrumb bar with Back button */}
          <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/[0.08] bg-brand-surface px-6">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-white/[0.1] bg-brand-dark px-2.5 text-xs text-zinc-300 hover:bg-white/[0.08] hover:text-zinc-100"
                  onClick={() => router.push(backHref)}
                  id="shell-back-btn"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{backLabel}</span>
                </Button>
              )}
              <div className="flex items-center gap-2 font-mono-tech text-xs text-zinc-400">
                <Link
                  className="transition-colors hover:text-zinc-100"
                  href="/dashboard"
                >
                  Dashboard
                </Link>

                <span className="text-zinc-600">/</span>
                <span className="font-medium text-zinc-200">{title}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-6 items-center justify-center rounded-sm border border-brand-purple/40 bg-brand-purple/20 px-2 font-mono-tech text-[11px] font-medium text-brand-purple">
                KairoPro Workspace
              </div>
            </div>
          </div>

          {/* Main workspace content */}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>

      {/* New project modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
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
                htmlFor="project-name-modal"
                className="font-mono-tech text-[11px] text-zinc-500"
              >
                Project Name
              </Label>
              <Input
                id="project-name-modal"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. telemetry-dashboard"
                className="border-white/[0.1] bg-brand-dark font-mono-tech text-xs text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-brand-purple/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="spec-modal"
                className="font-mono-tech text-[11px] text-zinc-500"
              >
                Initial Requirements / Outline
              </Label>
              <Textarea
                id="spec-modal"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                placeholder="Describe core entities, API routes, or copy-paste PRD contents..."
                rows={4}
                className="resize-none border-white/[0.1] bg-brand-dark font-mono-tech text-xs text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-brand-purple/40"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={submitting}>
                {submitting ? "Allocating node..." : "Create & Plan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Check, FileText, Layers, Zap } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { cn } from "@/lib/utils";

const PAGES = [
  {
    route: "/dashboard",
    description: "Main team workspace, project selector, and active sprints",
    access: "member",
  },
  {
    route: "/tasks",
    description:
      "Filterable task list and Kanban board with live status updates",
    access: "member",
  },
  {
    route: "/tasks/new",
    description: "Task creation modal with assignee and priority pickers",
    access: "member",
  },
  {
    route: "/tasks/[id]",
    description: "Detailed task view with markdown description and comments",
    access: "member",
  },
  {
    route: "/team",
    description: "Organization members list, role assignments, and invites",
    access: "admin",
  },
  {
    route: "/settings",
    description: "Project configuration, webhooks, and service credentials",
    access: "admin",
  },
  {
    route: "/login",
    description: "Email/password and Google OAuth authentication portal",
    access: "any",
  },
  {
    route: "/register",
    description: "Account registration with team workspace creation",
    access: "any",
  },
];

const ENDPOINTS = [
  {
    method: "GET",
    endpoint: "/api/tasks",
    purpose: "List tasks with filtering by status, priority, assignee",
  },
  {
    method: "POST",
    endpoint: "/api/tasks",
    purpose: "Create new task and emit activity log event",
  },
  {
    method: "GET",
    endpoint: "/api/tasks/[id]",
    purpose: "Fetch single task with relations (assignee, subtasks, comments)",
  },
  {
    method: "PATCH",
    endpoint: "/api/tasks/[id]",
    purpose: "Update task attributes, status transitions, priority",
  },
  {
    method: "DELETE",
    endpoint: "/api/tasks/[id]",
    purpose: "Delete task and cascade delete subtasks/comments",
  },
  {
    method: "GET",
    endpoint: "/api/team",
    purpose: "Fetch workspace members and pending invitation tokens",
  },
  {
    method: "POST",
    endpoint: "/api/team",
    purpose: "Invite new member and generate secure acceptance link",
  },
  {
    method: "DELETE",
    endpoint: "/api/team/[id]",
    purpose: "Revoke team membership and reassign active tasks",
  },
  {
    method: "POST",
    endpoint: "/api/comments",
    purpose: "Post comment on task thread and trigger notifications",
  },
];

const COMPONENTS = [
  "TaskCard",
  "TaskForm",
  "TaskList",
  "TaskStatusBadge",
  "PriorityBadge",
  "CommentThread",
  "TeamMemberRow",
  "InviteMemberDialog",
  "DashboardStats",
  "Sidebar",
  "TopBar",
  "EmptyState",
  "ConfirmDialog",
  "AvatarGroup",
];

const METHOD_CLASSES: Record<string, string> = {
  GET: "border-white/[0.1] bg-white/[0.06] text-zinc-300",
  POST: "border-brand-purple/40 bg-brand-purple/20 text-brand-purple-light",
  PATCH: "border-amber-400/40 bg-amber-400/20 text-amber-300",
  DELETE: "border-rose-400/40 bg-rose-400/20 text-rose-300",
};

function accessBadgeClasses(access: string): string {
  if (access === "admin") {
    return "border-brand-purple/40 bg-brand-purple/15 text-brand-purple-light";
  }
  if (access === "any") {
    return "border-white/[0.08] bg-white/[0.04] text-zinc-400";
  }
  return "border-white/[0.1] bg-white/[0.06] text-zinc-300";
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-brand-surface-muted">
      {children}
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: typeof FileText;
  title: string;
  badge: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.04] px-4 py-3">
      <div className="flex items-center gap-2.5">
        <Icon className="h-[15px] w-[15px] text-brand-purple-light" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">
          {title}
        </h3>
      </div>
      <span className="rounded-[3px] border border-white/[0.08] bg-white/[0.05] px-2 py-0.5 font-mono-tech text-[11px] text-zinc-300">
        {badge}
      </span>
    </div>
  );
}

export function ArchitectureSurface() {
  return (
    <div className="w-full min-w-0 flex-1 space-y-6">
      <FadeIn>
        <div className="flex flex-col justify-between gap-2 border-b border-white/[0.08] pb-3 sm:flex-row sm:items-baseline">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-100">
              App Structure &amp; Architecture Surface
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5 font-medium text-brand-green">
                <Check className="h-3 w-3" strokeWidth={3} />
                Ready for compilation
              </span>
              <span className="text-zinc-600">•</span>
              <span>8 routes</span>
              <span className="text-zinc-600">•</span>
              <span>9 API endpoints</span>
              <span className="text-zinc-600">•</span>
              <span>14 components</span>
            </div>
          </div>
          <div className="rounded-[3px] border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono-tech text-[11px] text-zinc-500">
            Architecture: Fullstack Next.js
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <SectionCard>
          <SectionHeader
            badge="Next.js 15 App Router"
            icon={FileText}
            title="Pages & Routing"
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03] font-mono-tech text-[11px] uppercase text-zinc-400">
                  <th className="w-48 px-4 py-2 font-medium">Route</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="w-24 px-4 py-2 text-right font-medium">
                    Access
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08] text-zinc-300">
                {PAGES.map((page) => (
                  <tr
                    className="h-10 transition-colors hover:bg-white/[0.04]"
                    key={page.route}
                  >
                    <td className="px-4 py-2 font-mono-tech font-medium text-zinc-100">
                      {page.route}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-400">
                      {page.description}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={cn(
                          "inline-block rounded-[3px] border px-2 py-0.5 font-mono-tech text-[11px]",
                          accessBadgeClasses(page.access),
                        )}
                      >
                        {page.access}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </FadeIn>

      <FadeIn delay={0.16}>
        <SectionCard>
          <SectionHeader
            badge="REST + Server Actions"
            icon={Zap}
            title="API Endpoints & Server Actions"
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03] font-mono-tech text-[11px] uppercase text-zinc-400">
                  <th className="w-24 px-4 py-2 font-medium">Method</th>
                  <th className="w-52 px-4 py-2 font-medium">Endpoint</th>
                  <th className="px-4 py-2 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08] text-zinc-300">
                {ENDPOINTS.map((endpoint) => (
                  <tr
                    className="h-10 transition-colors hover:bg-white/[0.04]"
                    key={`${endpoint.method}-${endpoint.endpoint}`}
                  >
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          "inline-block rounded-[3px] border px-2 py-0.5 font-mono-tech text-[11px] font-semibold",
                          METHOD_CLASSES[endpoint.method],
                        )}
                      >
                        {endpoint.method}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono-tech text-zinc-100">
                      {endpoint.endpoint}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-400">
                      {endpoint.purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </FadeIn>

      <FadeIn delay={0.24}>
        <section className="rounded-lg border border-white/[0.08] bg-brand-surface-muted p-4">
          <div className="flex flex-col justify-between gap-2 border-b border-white/[0.08] pb-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-[15px] w-[15px] text-brand-purple-light" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">
                  Component Architecture
                </h3>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                14 modular UI components generated with strict TypeScript props
              </p>
            </div>
            <span className="self-start rounded-[3px] border border-white/[0.08] bg-white/[0.05] px-2 py-0.5 font-mono-tech text-[11px] text-zinc-300 sm:self-auto">
              shadcn/ui + Tailwind
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 pt-4 sm:grid-cols-3 md:grid-cols-4">
            {COMPONENTS.map((component) => (
              <div
                className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono-tech text-xs text-zinc-200 transition-colors hover:border-brand-purple/50"
                key={component}
              >
                <span className="text-[10px] font-bold text-brand-purple">
                  &lt;&gt;
                </span>
                <span className="truncate">{component}</span>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>
    </div>
  );
}

import { CheckCircle2, LockKeyhole } from "lucide-react";

const FEATURES = [
  {
    title: "User accounts",
    description: "Auth, session management, profile state",
  },
  {
    title: "Teams & Tenants",
    description: "Workspace isolation, multi-tenancy",
  },
  {
    title: "Task Authoring",
    description: "Markdown editing, attachments, schema meta",
  },
  {
    title: "Assignment Router",
    description: "Single & role-based ticket assignment",
  },
  { title: "Priorities", description: "Urgent, High, Medium, Low levels" },
  {
    title: "Lifecycle Stages",
    description: "Backlog, Todo, In Progress, Review, Done",
  },
  {
    title: "Activity & Logs",
    description: "Activity feed, comments, system audits",
  },
  {
    title: "Admin Controls",
    description: "Member roles, workspace governance, keys",
  },
];

const ROLES = [
  {
    role: "Admin",
    scope: "Global platform operator",
    permissions:
      "Full workspace management, member invites, API tokens, billing controls.",
    highlighted: true,
  },
  {
    role: "Manager",
    scope: "Sprint & release controller",
    permissions:
      "Project creation, sprint cadence setup, bulk assignment, QA approvals.",
    highlighted: false,
  },
  {
    role: "Member",
    scope: "Individual contributor",
    permissions:
      "Create issues, mutate assigned tickets, comment on threads, inspect boards.",
    highlighted: false,
  },
];

const USER_STORIES = [
  {
    id: "US-01",
    actor: "As an Admin",
    story:
      ", I want to invite team members with specific roles, so that access control is maintained from day one.",
  },
  {
    id: "US-02",
    actor: "As a Manager",
    story:
      ", I want to create projects and set task priorities, so that the team understands delivery urgency.",
  },
  {
    id: "US-03",
    actor: "As a Member",
    story:
      ", I want to update task statuses and add progress comments, so that sprint status is transparent.",
  },
  {
    id: "US-04",
    actor: "As a Member",
    story:
      ", I want keyboard shortcuts to filter and assign tasks, so that I can manage my work without context switching.",
  },
  {
    id: "US-05",
    actor: "As an Admin",
    story:
      ", I want an audit trail of task status changes, so that historical progress can be reviewed.",
  },
];

const ASSUMPTIONS = [
  "Single PostgreSQL instance with multi-tenant row-level security policies per organization.",
  "Outbound notifications leverage standard SMTP transport variables injected into application secrets.",
  "Local encrypted POSIX volume fallback activated when S3 object credentials are not provisioned.",
];

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="mb-2 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
      {children}
    </h2>
  );
}

export function PrdDocument() {
  return (
    <div className="rounded-lg border border-white/[0.1] bg-brand-surface p-6 shadow-sm">
      <div className="border-b border-white/[0.1] pb-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Product Requirements — TaskFlow
          </h1>
          <span className="shrink-0 rounded-[3px] bg-white/[0.06] px-2 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Spec-Draft
          </span>
        </div>
        <p className="font-mono-tech text-[11px] text-zinc-400">
          Generated from your description and 1 attachment • v1.0 • PRD-001
        </p>
      </div>

      <section className="mt-6">
        <SectionHeading>01. Overview</SectionHeading>
        <div className="space-y-2 text-sm leading-relaxed text-zinc-400">
          <p>
            TaskFlow is an ultra-lean, high-throughput task management system
            engineered for technical teams. It favors deterministic keyboard
            shortcuts, multi-pane real-time viewports, and zero-latency
            local-first indexing over heavy corporate workflows.
          </p>
          <p>
            The application couples distributed state tracking with strict audit
            milestones, giving technical leads immutable provenance over
            architecture decisions, release blockers, and ticket transitions
            across multiple engineering squads.
          </p>
        </div>
      </section>

      <section className="mt-6 border-t border-white/[0.06] pt-3">
        <div className="mb-2 flex items-center justify-between">
          <SectionHeading>02. Must-Have Features</SectionHeading>
          <span className="font-mono-tech text-[10px] text-brand-green">
            8 verified items
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              className="flex items-start gap-2 rounded-[3px] border border-white/[0.06] bg-brand-dark p-2"
              key={feature.title}
            >
              <CheckCircle2
                className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand-green"
                fill="currentColor"
              />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-zinc-100">
                  {feature.title}
                </div>
                <div className="truncate text-xs text-zinc-400">
                  {feature.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 border-t border-white/[0.06] pt-3">
        <SectionHeading>03. User Roles</SectionHeading>
        <div className="overflow-x-auto rounded-[3px] border border-white/[0.08]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.06]">
              <tr className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-100">
                <th className="w-28 p-2">Role</th>
                <th className="p-2">Scope Description</th>
                <th className="p-2">Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {ROLES.map((role) => (
                <tr
                  className="transition-colors hover:bg-white/[0.03]"
                  key={role.role}
                >
                  <td
                    className={
                      role.highlighted
                        ? "p-2 font-semibold text-brand-purple-light"
                        : "p-2 font-semibold text-zinc-100"
                    }
                  >
                    {role.role}
                  </td>
                  <td className="p-2 text-zinc-400">{role.scope}</td>
                  <td className="p-2 text-zinc-100">{role.permissions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 border-t border-white/[0.06] pt-3">
        <SectionHeading>04. User Stories</SectionHeading>
        <div className="space-y-1">
          {USER_STORIES.map((story) => (
            <div
              className="flex items-start gap-2 rounded-[3px] border border-white/[0.05] bg-brand-dark p-2"
              key={story.id}
            >
              <span className="shrink-0 font-mono-tech text-[10px] font-semibold text-brand-purple-light">
                {story.id}
              </span>
              <p className="text-xs leading-relaxed text-zinc-400">
                <span className="font-medium text-zinc-100">{story.actor}</span>
                {story.story}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 border-t border-white/[0.06] pt-3">
        <SectionHeading>05. External Integrations</SectionHeading>
        <div className="flex items-center justify-between rounded-[3px] border border-white/[0.08] bg-brand-dark p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-brand-surface-muted text-brand-purple-light">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-zinc-100">
                Google Sign-In
              </div>
              <div className="text-xs text-zinc-400">
                OAuth 2.0 Client ID &amp; Secret required at deployment
              </div>
            </div>
          </div>
          <span className="shrink-0 rounded-[3px] bg-white/[0.06] px-2 py-1 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
            Pending Env
          </span>
        </div>
      </section>

      <section className="mt-6 border-t border-white/[0.06] pt-3">
        <div className="mb-2 flex items-center justify-between">
          <SectionHeading>06. Architecture Assumptions</SectionHeading>
          <span className="font-mono-tech text-[10px] italic text-zinc-400">
            Editable during Gate 2
          </span>
        </div>
        <ol className="list-inside list-decimal space-y-1 rounded-[3px] border border-white/[0.06] bg-brand-dark p-3 text-xs leading-relaxed text-zinc-400">
          {ASSUMPTIONS.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronDown,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

const SECTION_BASE = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

type Role = "owner" | "admin" | "member";

interface Member {
  name: string;
  email: string;
  role: Role;
  scope: string;
  lastActive: string;
  online?: boolean;
  you?: boolean;
}

const MEMBERS: Member[] = [
  {
    name: "Ada Lovelace",
    email: "ada@lovelace.dev",
    role: "owner",
    scope: "All projects & root credentials",
    lastActive: "Active now",
    online: true,
    you: true,
  },
  {
    name: "Kenji Chen",
    email: "kenji@company.com",
    role: "admin",
    scope: "Full read/write, deploy to prod",
    lastActive: "12m ago",
  },
  {
    name: "Sarah Rodriguez",
    email: "sarah.r@company.com",
    role: "admin",
    scope: "Full read/write, deploy to prod",
    lastActive: "3 hours ago",
  },
  {
    name: "David Wang",
    email: "david.w@company.com",
    role: "member",
    scope: "Project-scoped (TaskFlow, Invoice CRM)",
    lastActive: "Yesterday",
  },
];

interface Invite {
  email: string;
  role: "admin" | "member";
  invitedBy: string;
  time: string;
}

const INITIAL_INVITES: Invite[] = [
  {
    email: "marcus.chen@company.com",
    role: "admin",
    invitedBy: "Ada Lovelace",
    time: "2 days ago",
  },
];

const ROLE_FILTERS = [
  { id: "all", label: "All Roles" },
  { id: "owner", label: "Owner" },
  { id: "admin", label: "Admin" },
  { id: "member", label: "Member" },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function RoleChip({ role }: { role: Role }) {
  if (role === "owner") {
    return (
      <span className="rounded-[2px] bg-brand-purple px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-white">
        Owner
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span className="rounded-[2px] bg-white/[0.1] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-purple-light">
        Admin
      </span>
    );
  }
  return (
    <span className="rounded-[2px] bg-white/[0.08] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
      Member
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="peer sr-only"
      />
      <div
        className={cn(
          "h-5 w-9 rounded-full transition-colors peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-purple-light/60",
          checked ? "bg-brand-purple" : "bg-white/[0.12]",
        )}
      >
        <div
          className={cn(
            "top-[2px] left-[2px] h-4 w-4 rounded-full bg-white transition-transform",
            checked && "translate-x-4",
          )}
        />
      </div>
    </label>
  );
}

export function TeamSettings() {
  const [members] = useState(MEMBERS);
  const [invites, setInvites] = useState(INITIAL_INVITES);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [agentLoops, setAgentLoops] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [resent, setResent] = useState<Record<string, boolean>>({});
  const [emailError, setEmailError] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  useEffect(() => {
    if (!inviteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInviteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inviteOpen]);

  const filteredMembers = members.filter((m) => {
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q);
    return matchesRole && matchesQuery;
  });

  const sendInvite = () => {
    const email = inviteEmail.trim();
    if (!email || !email.includes("@")) {
      setEmailError(true);
      return;
    }
    setInvites((prev) => [
      ...prev,
      {
        email,
        role: inviteRole,
        invitedBy: "Ada Lovelace",
        time: "just now",
      },
    ]);
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("member");
    setEmailError(false);
  };

  const revokeInvite = (email: string) => {
    setInvites((prev) => prev.filter((i) => i.email !== email));
  };

  const resendInvite = (email: string) => {
    setResent((prev) => ({ ...prev, [email]: true }));
    timers.current.push(
      setTimeout(
        () => setResent((prev) => ({ ...prev, [email]: false })),
        1500,
      ),
    );
  };

  return (
    <div className="flex w-full max-w-[880px] flex-col gap-4">
      <motion.div
        {...SECTION_BASE}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col justify-between gap-3 pb-1 md:flex-row md:items-center"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-semibold leading-8 tracking-tight text-zinc-100">
              Team &amp; Members
            </h1>
            <span className="rounded-[2px] bg-brand-purple/20 px-2 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-purple-light">
              Pro Plus Tier
            </span>
          </div>
          <p className="max-w-2xl text-[13px] leading-relaxed text-zinc-300">
            Manage organization workspace members, role-based access control
            (RBAC), seat allocation, and invite collaborators.
          </p>
        </div>
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[2px] bg-brand-purple px-3 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-[#5544dc]"
          >
            <Plus className="h-4 w-4" />
            Invite member
          </button>
        </div>
      </motion.div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <motion.div
          {...SECTION_BASE}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.06 }}
          className="flex flex-col justify-between gap-2 rounded-[4px] border border-white/[0.06] bg-white/[0.03] p-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Seat Allocation
            </span>
            <span className="font-mono-tech text-[11px] text-brand-purple-light">
              40%
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="font-mono-tech text-[20px] font-semibold leading-7 text-zinc-100">
              4 / 10{" "}
              <span className="text-[12px] font-normal text-zinc-300">
                Seats used
              </span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "40%" }}
                transition={{
                  duration: 0.9,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.25,
                }}
                className="h-full rounded-full bg-brand-purple"
              />
            </div>
          </div>
          <span className="text-[12px] text-zinc-400">
            6 available on Pro Plus plan
          </span>
        </motion.div>

        <motion.div
          {...SECTION_BASE}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          className="flex flex-col justify-between gap-2 rounded-[4px] border border-white/[0.06] bg-white/[0.03] p-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Role Distribution
            </span>
            <ShieldCheck className="h-[18px] w-[18px] text-zinc-400" />
          </div>
          <div className="font-mono-tech text-[13px] text-zinc-100">
            1 Owner · 2 Admins · 1 Member
          </div>
          <span className="text-[12px] text-zinc-400">
            All users mapped to production ACL
          </span>
        </motion.div>

        <motion.div
          {...SECTION_BASE}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.14 }}
          className="flex flex-col justify-between gap-2 rounded-[4px] border border-white/[0.06] bg-white/[0.03] p-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              SSO &amp; Directory Sync
            </span>
            <span className="rounded-[2px] bg-white/[0.08] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-green">
              Enforced
            </span>
          </div>
          <div className="text-[15px] font-semibold leading-5 tracking-tight text-zinc-100">
            SAML / SCIM Active
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-brand-green">
            <span className="h-2 w-2 rounded-full bg-brand-green" />
            <span>Okta synced 14m ago</span>
          </div>
        </motion.div>
      </section>

      <motion.section
        {...SECTION_BASE}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.18 }}
        className="flex flex-col gap-2 rounded-[4px] border border-white/[0.06] bg-white/[0.03] p-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold leading-5 tracking-tight text-zinc-100">
              Pending Invites
            </span>
            <span className="rounded-[2px] bg-white/[0.08] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold text-zinc-300">
              {invites.length}
            </span>
          </div>
          <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Invites expire after 7 days
          </span>
        </div>
        {invites.length === 0 ? (
          <div className="flex items-center gap-2 rounded-[2px] bg-white/[0.02] p-3 font-mono-tech text-[11px] text-zinc-500">
            <Mail className="h-4 w-4" />
            No pending invitations — all seats active
          </div>
        ) : (
          invites.map((invite) => (
            <div
              key={invite.email}
              className="flex flex-col justify-between gap-2 rounded-[2px] bg-white/[0.02] p-2 md:flex-row md:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] bg-white/[0.08]">
                  <Mail className="h-[18px] w-[18px] text-zinc-400" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-mono-tech text-[12px] font-medium text-zinc-100">
                      {invite.email}
                    </span>
                    <span className="rounded-[2px] bg-white/[0.1] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
                      Role: {invite.role === "admin" ? "Admin" : "Member"}
                    </span>
                    <span className="flex items-center gap-1 rounded-[2px] bg-brand-cyan/10 px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-cyan">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
                      Pending acceptance
                    </span>
                  </div>
                  <span className="mt-0.5 text-[12px] text-zinc-400">
                    Invited {invite.time} by {invite.invitedBy}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end text-[12px] md:self-auto">
                <button
                  type="button"
                  onClick={() => resendInvite(invite.email)}
                  className={cn(
                    "rounded-[2px] px-2 py-1 font-mono-tech text-[11px] transition-colors",
                    resent[invite.email]
                      ? "text-brand-green"
                      : "text-brand-purple-light hover:bg-white/[0.08]",
                  )}
                >
                  {resent[invite.email] ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Sent!
                    </span>
                  ) : (
                    "Resend invite"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => revokeInvite(invite.email)}
                  className="rounded-[2px] px-2 py-1 font-mono-tech text-[11px] text-rose-400 transition-colors hover:bg-rose-400/10"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))
        )}
      </motion.section>

      <motion.section
        {...SECTION_BASE}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.22 }}
        className="flex flex-col overflow-hidden rounded-[4px] border border-white/[0.06] bg-white/[0.03]"
      >
        <div className="flex flex-col justify-between gap-2 bg-white/[0.03] p-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute top-1/2 left-2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter members by name or email..."
              className="w-full rounded-[2px] border border-transparent bg-brand-dark py-1.5 pr-3 pl-8 font-mono-tech text-[12px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-white/[0.2]"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-[2px] bg-white/[0.06] px-2 py-1.5 font-mono-tech text-[11px] font-medium text-zinc-300 transition-colors hover:text-zinc-100"
              >
                <ChevronDown className="h-4 w-4" />
                <span>
                  {ROLE_FILTERS.find((f) => f.id === roleFilter)?.label}
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <AnimatePresence>
                {filterOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close filter"
                      className="fixed inset-0 z-[190] cursor-default"
                      onClick={() => setFilterOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 z-[200] mt-1 flex w-32 flex-col rounded-[2px] border border-white/[0.08] bg-brand-surface py-1 shadow-lg"
                    >
                      {ROLE_FILTERS.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => {
                            setRoleFilter(filter.id);
                            setFilterOpen(false);
                          }}
                          className={cn(
                            "px-3 py-1.5 text-left font-mono-tech text-[11px] transition-colors hover:bg-white/[0.05]",
                            roleFilter === filter.id
                              ? "text-brand-purple-light"
                              : "text-zinc-300",
                          )}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {filteredMembers.length} of {members.length} members
            </div>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="bg-white/[0.04] font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="px-3 py-2">Member</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Access Scope</th>
                <th className="px-3 py-2">Last Active</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member, i) => (
                <tr
                  key={member.email}
                  className={cn(
                    "transition-colors hover:bg-white/[0.03]",
                    i % 2 === 1 && "bg-white/[0.02]",
                  )}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] font-mono-tech text-[11px] font-semibold",
                          member.role === "owner"
                            ? "bg-brand-purple text-white"
                            : "bg-white/[0.08] text-zinc-100",
                        )}
                      >
                        {initials(member.name)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-[15px] font-semibold leading-tight text-zinc-100">
                          <span className="tracking-tight">{member.name}</span>
                          {member.you && (
                            <span className="font-mono-tech text-[10px] font-normal text-zinc-400">
                              (You)
                            </span>
                          )}
                        </div>
                        <span className="font-mono-tech text-[11px] text-zinc-400">
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <RoleChip role={member.role} />
                  </td>
                  <td className="max-w-xs truncate px-3 py-3 font-mono-tech text-[11px] text-zinc-100">
                    {member.scope}
                  </td>
                  <td className="px-3 py-3">
                    {member.online ? (
                      <div className="flex items-center gap-1.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-green">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                        Active now
                      </div>
                    ) : (
                      <span className="font-mono-tech text-[11px] text-zinc-400">
                        {member.lastActive}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    {member.you ? (
                      "—"
                    ) : (
                      <button
                        type="button"
                        className="rounded-[2px] bg-white/[0.06] px-2 py-1 font-mono-tech text-[11px] font-medium normal-case tracking-normal text-zinc-100 transition-colors hover:bg-white/[0.1]"
                      >
                        Manage
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center font-mono-tech text-[11px] text-zinc-500"
                  >
                    No members match the current filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.section>

      <motion.section
        {...SECTION_BASE}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.26 }}
        className="flex flex-col gap-2 rounded-[4px] border border-white/[0.06] bg-white/[0.03] p-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-cyan" />
            <h2 className="text-[15px] font-semibold leading-5 tracking-tight text-zinc-100">
              Autonomous Agent Execution ACL
            </h2>
          </div>
          <span className="rounded-[2px] bg-white/[0.06] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-cyan">
            Platform Guardrail
          </span>
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-[2px] bg-white/[0.02] p-3 sm:flex-row sm:items-center">
          <div className="flex max-w-2xl flex-col gap-1">
            <div className="text-[13px] font-medium text-zinc-100">
              Allow Members to initiate autonomous agent background loops
            </div>
            <div className="text-[12px] leading-relaxed text-zinc-400">
              When enabled, Members can prompt Kairo agent to refactor schemas,
              execute self-correcting unit test suites, and commit code changes
              directly to branches.
            </div>
          </div>
          <Toggle
            checked={agentLoops}
            onChange={setAgentLoops}
            label="Allow Members to initiate autonomous agent background loops"
          />
        </div>
      </motion.section>

      <motion.section
        {...SECTION_BASE}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
        className="flex flex-col gap-3 rounded-[4px] border border-white/[0.06] bg-white/[0.03] p-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold leading-5 tracking-tight text-zinc-100">
            Role Permissions &amp; Governance
          </h2>
          <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Standard RBAC Policy v2.4
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 text-[12px] md:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-[2px] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <span className="rounded-[2px] bg-brand-purple px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-white">
                Owner
              </span>
              <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Global Root
              </span>
            </div>
            <p className="leading-relaxed text-zinc-400">
              Full billing authority, workspace deletion, credential extraction,
              team seat purchases, and root agent execution limits.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-[2px] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <span className="rounded-[2px] bg-white/[0.1] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-purple-light">
                Admin
              </span>
              <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Orchestration
              </span>
            </div>
            <p className="leading-relaxed text-zinc-400">
              Project initialization, deployment triggers, third-party service
              credential management, and multi-threaded agent workflows.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-[2px] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <span className="rounded-[2px] bg-white/[0.08] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
                Member
              </span>
              <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Contributor
              </span>
            </div>
            <p className="leading-relaxed text-zinc-400">
              Interactive code editor access, pull request submission, local
              sandbox preview runs, and individual agent debugging prompts.
            </p>
          </div>
        </div>
      </motion.section>

      <AnimatePresence>
        {inviteOpen && (
          <div
            className="fixed inset-0 z-[180] flex items-center justify-center bg-brand-dark/80 p-4 backdrop-blur-sm"
            onClick={() => setInviteOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="flex w-full max-w-lg flex-col gap-4 rounded-[4px] border border-white/[0.08] bg-brand-surface p-4 shadow-xl"
            >
              <div className="flex items-start justify-between border-b border-white/[0.06] pb-2">
                <div className="flex flex-col">
                  <h3 className="text-[20px] font-semibold leading-7 tracking-tight text-zinc-100">
                    Invite Workspace Member
                  </h3>
                  <span className="text-[12px] text-zinc-400">
                    Seat 5 of 10 will be allocated upon acceptance
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="rounded-[2px] p-1 text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setEmailError(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                  placeholder="colleague@company.com"
                  className={cn(
                    "w-full rounded-[2px] border bg-brand-dark px-3 py-2 font-mono-tech text-[12px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600",
                    emailError
                      ? "border-rose-400/60"
                      : "border-white/[0.15] focus:border-brand-purple-light",
                  )}
                />
                {emailError && (
                  <span className="text-[11px] text-rose-400">
                    Enter a valid email address
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Assign Workspace Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        id: "member",
                        title: "Member",
                        desc: "Read/write access to assign projects",
                      },
                      {
                        id: "admin",
                        title: "Admin",
                        desc: "Infrastructure & agent deployment",
                      },
                    ] as const
                  ).map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setInviteRole(role.id)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-[2px] border p-2.5 text-left transition-all",
                        inviteRole === role.id
                          ? "border-brand-purple-light bg-brand-purple/10"
                          : "border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12]",
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-100">
                        <span
                          className={cn(
                            "flex h-3.5 w-3.5 items-center justify-center rounded-full border",
                            inviteRole === role.id
                              ? "border-brand-purple-light"
                              : "border-white/[0.25]",
                          )}
                        >
                          {inviteRole === role.id && (
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-purple-light" />
                          )}
                        </span>
                        {role.title}
                      </span>
                      <span className="text-[12px] leading-relaxed text-zinc-400">
                        {role.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] pt-3">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="rounded-[2px] px-3 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={sendInvite}
                  className="rounded-[2px] bg-brand-purple px-3 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-[#5544dc]"
                >
                  Send invitation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { motion } from "motion/react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  History,
  IdCard,
  KeySquare,
  Laptop,
  Loader2,
  Network,
  Plus,
  Save,
  Server,
  Trash2,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { GithubMark } from "@/components/workspace/export-modal";
import { useAuthStore } from "@/stores";

function GitLabMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" />
    </svg>
  );
}

const DEFAULTS = {
  fullName: "Ada Lovelace",
  username: "adalovelace",
  timezone: "pst",
  bio: "Full-stack engineer building automated workflows and serverless tools.",
};

const TIMEZONES = [
  {
    value: "pst",
    label: "UTC-8 (Pacific Standard Time - America/Los_Angeles)",
  },
  { value: "utc", label: "UTC+0 (Coordinated Universal Time - London)" },
  { value: "est", label: "UTC-5 (Eastern Standard Time - New York)" },
  { value: "cet", label: "UTC+1 (Central European Time - Berlin)" },
  { value: "jst", label: "UTC+9 (Japan Standard Time - Tokyo)" },
];

const SSH_KEYS = [
  {
    name: "id_ed25519_macbook",
    chip: "Active",
    chipTone: "green" as const,
    type: "ED25519",
    sha: "SHA256:7uK8x9pQ...9aQ2L",
    added: "Oct 12, 2024",
    lastUsed: "2 hours ago",
    lastUsedTone: "cyan" as const,
    icon: Laptop,
    iconTone: "cyan" as const,
  },
  {
    name: "id_rsa_workstation",
    chip: "Read/Write",
    chipTone: "zinc" as const,
    type: "RSA-4096",
    sha: "SHA256:3xM4w2aP...1zP80",
    added: "Aug 04, 2024",
    lastUsed: "3 days ago",
    lastUsedTone: "zinc" as const,
    icon: Server,
    iconTone: "purple" as const,
  },
];

type SavePhase = "idle" | "saving" | "saved";

function SectionHeader({
  icon,
  iconTone,
  title,
  desc,
  right,
}: {
  icon: ReactNode;
  iconTone: "purple" | "cyan";
  title: string;
  desc: string;
  right: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-[2px] bg-white/[0.03] px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            iconTone === "purple"
              ? "text-brand-purple-light"
              : "text-brand-cyan",
          )}
        >
          {icon}
        </span>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-zinc-100">
            {title}
          </h2>
          <p className="text-[12px] leading-4 text-zinc-300">{desc}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

export function ProfileSettings() {
  const { data: session } = useSession();
  const user = session?.user;
  const authUserName = useAuthStore((s) => s.userName);
  const authUserEmail = useAuthStore((s) => s.userEmail);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [fullName, setFullName] = useState(
    authUserName ?? user?.name ?? DEFAULTS.fullName,
  );
  const [username, setUsername] = useState(
    authUserEmail
      ? authUserEmail.split("@")[0]!
      : user?.email
        ? user.email.split("@")[0]!
        : DEFAULTS.username,
  );
  const [timezone, setTimezone] = useState(DEFAULTS.timezone);
  const [bio, setBio] = useState(DEFAULTS.bio);
  const [githubConnected, setGithubConnected] = useState(true);
  const [phase, setPhase] = useState<SavePhase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (user?.name) setFullName(user.name);
    if (user?.email) setUsername(user.email.split("@")[0]!);
  }, [user]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  const initials =
    fullName
      .trim()
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "AL";

  const reset = () => {
    clearTimers();
    setPhase("idle");
    setFullName(DEFAULTS.fullName);
    setUsername(DEFAULTS.username);
    setTimezone(DEFAULTS.timezone);
    setBio(DEFAULTS.bio);
    setGithubConnected(true);
  };

  const save = () => {
    if (phase !== "idle") return;
    setPhase("saving");
    if (user?.id) {
      setAuth({
        userId: user.id,
        userName: fullName,
        userEmail: user.email ?? `${username}@kairopro.app`,
        activeOrgId: (user as any).activeOrgId ?? "org_default",
      });
    }
    timers.current.push(setTimeout(() => setPhase("saved"), 600));
    timers.current.push(setTimeout(() => setPhase("idle"), 600 + 1800));
  };

  const saveContent = (): ReactNode => {
    if (phase === "saving")
      return (
        <>
          <Loader2 className="h-[18px] w-[18px] animate-spin" />
          <span>Applying...</span>
        </>
      );
    if (phase === "saved")
      return (
        <>
          <Check className="h-[18px] w-[18px] text-brand-green" />
          <span>Saved!</span>
        </>
      );
    return (
      <>
        <Save className="h-[18px] w-[18px]" />
        <span>Save changes</span>
      </>
    );
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: "easeOut" },
        }}
        className="flex flex-col gap-1 pb-1"
      >
        <div className="flex items-center gap-2">
          <h1 className="text-[24px] font-semibold leading-8 tracking-tight text-zinc-100">
            Profile Settings
          </h1>
          <span className="rounded-[2px] bg-brand-purple-light/15 px-2 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wide text-brand-purple-light">
            Developer Console
          </span>
        </div>
        <p className="max-w-2xl text-[13px] leading-[18px] text-zinc-300">
          Manage your personal information, developer persona, verified
          endpoints, and account security preferences.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: "easeOut", delay: 0.06 },
        }}
        className="flex flex-col gap-6 rounded-[2px] bg-white/[0.05] p-6 shadow-sm"
      >
        <SectionHeader
          icon={<IdCard className="h-5 w-5" />}
          iconTone="purple"
          title="Avatar & Developer Identity"
          desc="Visual appearance across autonomous agent review threads and commits."
          right={
            <span className="font-mono-tech text-[11px] text-zinc-500">
              SEC-UUID: #0192-AL-88
            </span>
          }
        />

        <div className="flex flex-col items-start gap-6 rounded-[2px] bg-brand-dark p-4 md:flex-row md:items-center">
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-[8px] bg-gradient-to-tr from-brand-purple via-brand-purple/60 to-brand-cyan text-[20px] font-bold tracking-tight text-white shadow-md">
              {initials}
            </div>
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-brand-green ring-2 ring-brand-dark" />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-[2px] bg-brand-purple px-3 py-1 text-[15px] font-semibold tracking-tight text-white shadow-sm transition-colors hover:bg-brand-purple/85"
              >
                <Upload className="h-4 w-4" />
                Change avatar
              </button>
              <button
                type="button"
                className="rounded-[2px] bg-white/[0.05] px-3 py-1.5 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
              >
                Remove
              </button>
            </div>
            <p className="text-[12px] leading-4 text-zinc-500">
              Recommended: 256x256px JPG, PNG or WebP. Max 2MB. SVG vectors
              automatically rasterized.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="fullName"
              className="flex items-center justify-between text-[15px] font-semibold tracking-tight text-zinc-100"
            >
              <span>Full name</span>
              <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-[0.05em] text-zinc-500">
                Required
              </span>
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-[2px] bg-brand-dark px-3 py-2 text-[13px] text-zinc-100 transition-colors outline-none focus:bg-white/[0.03]"
            />
            <span className="text-[12px] leading-4 text-zinc-300">
              Shown on pull requests, deployment logs, and agent audit trails.
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="username"
              className="flex items-center justify-between text-[15px] font-semibold tracking-tight text-zinc-100"
            >
              <span>Username / Handle</span>
              <span className="font-mono-tech text-[11px] text-brand-cyan">
                Public Namespace
              </span>
            </label>
            <div className="flex w-full items-center rounded-[2px] bg-brand-dark px-3 py-2">
              <span className="select-none font-mono-tech text-[12px] text-zinc-500">
                kairopro.app/@
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""),
                  )
                }
                className="ml-0.5 w-full bg-transparent font-mono-tech text-[12px] text-brand-cyan outline-none"
              />
            </div>
            <span className="text-[12px] leading-4 text-zinc-300">
              Unique identifier used for tagging inside workflow runs.
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="flex items-center justify-between text-[15px] font-semibold tracking-tight text-zinc-100"
            >
              <span>Primary Email address</span>
              <span className="flex items-center gap-1 rounded-[2px] bg-brand-green/20 px-2 py-0.5 font-mono-tech text-[10px] font-semibold text-brand-green">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </span>
            </label>
            <div className="flex items-center justify-between rounded-[2px] bg-brand-dark px-3 py-2">
              <span className="font-mono-tech text-[12px] text-zinc-100">
                ada@lovelace.dev
              </span>
              <button
                type="button"
                className="font-mono-tech text-[10px] font-semibold text-brand-purple-light transition-colors hover:text-brand-purple-light/70"
              >
                Change primary
              </button>
            </div>
            <span className="text-[12px] leading-4 text-zinc-300">
              Used for build failure webhooks and multi-factor auth challenges.
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="timezone"
              className="text-[15px] font-semibold tracking-tight text-zinc-100"
            >
              Timezone
            </label>
            <div className="relative">
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-[2px] bg-brand-dark px-3 py-2 text-[13px] text-zinc-100 transition-colors outline-none focus:bg-white/[0.03]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-[18px] w-[18px] text-zinc-500" />
            </div>
            <span className="text-[12px] leading-4 text-zinc-300">
              Determines cron schedules and workflow recurrence charts.
            </span>
          </div>

          <div className="flex flex-col gap-1 md:col-span-2">
            <label
              htmlFor="bio"
              className="flex items-center justify-between text-[15px] font-semibold tracking-tight text-zinc-100"
            >
              <span>Bio &amp; Persona</span>
              <span className="font-mono-tech text-[11px] text-zinc-500">
                {bio.length} / 240 chars
              </span>
            </label>
            <textarea
              id="bio"
              rows={3}
              maxLength={240}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full resize-none rounded-[2px] bg-brand-dark px-3 py-2 text-[13px] text-zinc-100 transition-colors outline-none focus:bg-white/[0.03]"
            />
            <span className="text-[12px] leading-4 text-zinc-300">
              Brief context fed into autonomous pairing agents to align code
              styling and language conventions.
            </span>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: "easeOut", delay: 0.12 },
        }}
        className="flex flex-col gap-6 rounded-[2px] bg-white/[0.05] p-6 shadow-sm"
      >
        <SectionHeader
          icon={<Network className="h-5 w-5" />}
          iconTone="cyan"
          title="Connected Accounts & Git Providers"
          desc="Authenticate repository sync triggers and deployment pull requests."
          right={
            <span className="font-mono-tech text-[11px] text-brand-green">
              OAUTH 2.0 ACTIVE
            </span>
          }
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col justify-between gap-3 rounded-[2px] bg-brand-dark p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[2px] bg-white/[0.05] text-zinc-100">
                  <GithubMark className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
                      GitHub
                    </span>
                    {githubConnected && (
                      <span className="font-mono-tech text-[11px] text-brand-purple-light">
                        @adalovelace
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    {githubConnected ? (
                      <>
                        <span className="flex items-center gap-1 font-mono-tech text-[10px] font-semibold text-brand-green">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                          Connected
                        </span>
                        <span className="text-xs text-zinc-700">•</span>
                        <span className="font-mono-tech text-[11px] text-zinc-300">
                          Last synced 10m ago
                        </span>
                      </>
                    ) : (
                      <span className="flex items-center gap-1 font-mono-tech text-[10px] font-semibold text-zinc-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                        Not connected
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {githubConnected ? (
                <button
                  type="button"
                  onClick={() => setGithubConnected(false)}
                  className="rounded-[2px] px-2 py-1 font-mono-tech text-[11px] font-medium text-rose-400 transition-colors hover:bg-rose-400/10"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setGithubConnected(true)}
                  className="flex items-center gap-1 rounded-[2px] bg-white/[0.08] px-3 py-1 text-[15px] font-semibold tracking-tight text-zinc-100 transition-colors hover:bg-white/[0.12]"
                >
                  <Plus className="h-4 w-4" />
                  Connect
                </button>
              )}
            </div>
            <div className="flex items-center justify-between rounded-[2px] bg-white/[0.05] px-2 py-1 font-mono-tech text-[11px] text-zinc-300">
              {githubConnected ? (
                <>
                  <span>Sync scopes: repo, read:user, workflow</span>
                  <span className="cursor-pointer text-brand-cyan hover:underline">
                    Re-authorize
                  </span>
                </>
              ) : (
                <>
                  <span>Authenticate via OAuth to sync repositories</span>
                  <span className="text-zinc-500">Required for deploys</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-[2px] bg-brand-dark p-4 opacity-90 transition-opacity hover:opacity-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[2px] bg-white/[0.05] text-zinc-100">
                  <GitLabMark className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
                      GitLab
                    </span>
                    <span className="rounded-[2px] bg-white/[0.08] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold text-zinc-500">
                      Self-hosted / Cloud
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="flex items-center gap-1 font-mono-tech text-[10px] font-semibold text-zinc-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                      Not connected
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 rounded-[2px] bg-white/[0.08] px-3 py-1 text-[15px] font-semibold tracking-tight text-zinc-100 transition-colors hover:bg-white/[0.12]"
              >
                <Plus className="h-4 w-4" />
                Connect
              </button>
            </div>
            <div className="flex items-center justify-between rounded-[2px] bg-white/[0.05] px-2 py-1 font-mono-tech text-[11px] text-zinc-300">
              <span>Target: gitlab.com &amp; custom domains</span>
              <span className="text-zinc-500">Optional</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-zinc-100">
                <KeySquare className="h-[18px] w-[18px] text-brand-purple-light" />
                Registered SSH Keys
              </h3>
              <p className="text-[12px] leading-4 text-zinc-300">
                Deploy keys allowed to trigger CLI runs and inspect isolated
                sandbox pods.
              </p>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-[2px] bg-brand-purple px-3 py-1 text-[15px] font-semibold tracking-tight text-white shadow-sm transition-colors hover:bg-brand-purple/85"
            >
              <Plus className="h-4 w-4" />
              Add SSH Key
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {SSH_KEYS.map((key) => {
              const KeyIcon = key.icon;
              return (
                <div
                  key={key.name}
                  className="flex flex-col justify-between gap-3 rounded-[2px] bg-brand-dark p-3 md:flex-row md:items-center"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 rounded-[2px] bg-white/[0.05] p-1",
                        key.iconTone === "cyan"
                          ? "text-brand-cyan"
                          : "text-brand-purple-light",
                      )}
                    >
                      <KeyIcon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-tech text-[13px] font-semibold text-zinc-100">
                          {key.name}
                        </span>
                        <span
                          className={cn(
                            "rounded-[2px] px-2 py-0.5 font-mono-tech text-[10px] font-semibold",
                            key.chipTone === "green"
                              ? "bg-brand-green/15 text-brand-green"
                              : "bg-white/[0.08] text-zinc-500",
                          )}
                        >
                          {key.chip}
                        </span>
                        <span className="font-mono-tech text-[11px] text-zinc-500">
                          {key.type}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 font-mono-tech text-[11px] text-zinc-300">
                        <span className="text-zinc-500">{key.sha}</span>
                        <span className="text-zinc-700">•</span>
                        <span>Added: {key.added}</span>
                        <span className="text-zinc-700">•</span>
                        <span
                          className={cn(
                            key.lastUsedTone === "cyan"
                              ? "text-brand-cyan"
                              : "text-zinc-300",
                          )}
                        >
                          Last used: {key.lastUsed}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 self-end md:self-center">
                    <button
                      type="button"
                      title="Audit Log"
                      className="rounded-[2px] p-1 text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                    >
                      <History className="h-[18px] w-[18px]" />
                    </button>
                    <button
                      type="button"
                      title="Delete Key"
                      className="rounded-[2px] p-1 text-zinc-300 transition-colors hover:bg-rose-400/10 hover:text-rose-400"
                    >
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: "easeOut", delay: 0.18 },
        }}
        className="flex flex-col items-start justify-between gap-3 rounded-[2px] bg-white/[0.05] p-4 md:flex-row md:items-center"
      >
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-green" />
          <p className="text-[12px] leading-4 text-zinc-300">
            Changes to your profile and SSH keys take effect immediately across
            all active projects and runner pods.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            onClick={reset}
            className="rounded-[2px] bg-white/[0.08] px-4 py-1 text-[15px] font-semibold tracking-tight text-zinc-100 transition-colors hover:bg-white/[0.12]"
          >
            Cancel / Reset
          </button>
          <button
            type="button"
            onClick={save}
            disabled={phase !== "idle"}
            className={cn(
              "flex min-w-[138px] items-center justify-center gap-1.5 rounded-[2px] px-5 py-1.5 text-[15px] font-semibold tracking-tight text-white shadow-md transition-colors",
              phase === "idle"
                ? "cursor-pointer bg-brand-purple hover:bg-brand-purple/85"
                : "cursor-default bg-brand-purple/85",
            )}
          >
            {saveContent()}
          </button>
        </div>
      </motion.section>
    </div>
  );
}

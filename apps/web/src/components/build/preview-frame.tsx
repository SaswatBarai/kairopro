"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Flag,
  Lock,
  Monitor,
  Smartphone,
} from "lucide-react";

import { cn } from "@/lib/utils";

const PREVIEW_URL = "https://taskflow-preview-0482.kairo.dev";

type ViewMode = "desktop" | "mobile";

export function PreviewFrame() {
  const [view, setView] = useState<ViewMode>("desktop");
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    void navigator.clipboard?.writeText(PREVIEW_URL);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-brand-surface-muted">
      <div className="flex select-none items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.04] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/[0.12]" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/[0.12]" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/[0.12]" />
        </div>
        <div className="mx-2 flex w-full max-w-sm items-center justify-between gap-1.5 rounded-[3px] bg-brand-dark px-3 py-1 shadow-inner">
          <div className="flex min-w-0 items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 flex-shrink-0 text-brand-green" />
            <span className="truncate font-mono-tech text-[11px] text-zinc-100">
              {PREVIEW_URL}
            </span>
          </div>
          <button
            className="flex-shrink-0 cursor-pointer text-zinc-400 transition-colors hover:text-zinc-100"
            title="Copy URL"
            type="button"
            onClick={copyUrl}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-brand-green" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-[3px] bg-brand-surface p-0.5">
          <button
            className={cn(
              "flex cursor-pointer items-center rounded-[2px] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider transition-colors",
              view === "desktop"
                ? "bg-brand-surface-muted text-zinc-100"
                : "text-zinc-400 hover:text-zinc-100",
            )}
            title="Desktop view"
            type="button"
            onClick={() => setView("desktop")}
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            className={cn(
              "flex cursor-pointer items-center rounded-[2px] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider transition-colors",
              view === "mobile"
                ? "bg-brand-surface-muted text-zinc-100"
                : "text-zinc-400 hover:text-zinc-100",
            )}
            title="Mobile view"
            type="button"
            onClick={() => setView("mobile")}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "flex w-full flex-col justify-between gap-3 bg-brand-dark p-3 transition-all duration-300",
          view === "mobile" && "mx-auto max-w-xs rounded-lg",
        )}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-lg bg-brand-surface px-3 py-2">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-brand-purple text-xs font-bold text-white">
                T
              </div>
              <span className="text-sm font-semibold tracking-tight text-zinc-100">
                TaskFlow HQ
              </span>
              <span className="rounded-[2px] bg-white/[0.08] px-1 py-0.5 font-mono-tech text-[10px] text-zinc-400">
                v0.1-preview
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Sprint #4</span>
              <div className="flex -space-x-1.5 overflow-hidden">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-purple/80 text-[10px] font-bold text-white ring-1 ring-brand-surface">
                  AK
                </div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-cyan/80 text-[10px] font-bold text-cyan-950 ring-1 ring-brand-surface">
                  ML
                </div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green/80 text-[10px] font-bold text-emerald-950 ring-1 ring-brand-surface">
                  ST
                </div>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "grid items-start gap-3",
              view === "mobile" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3",
            )}
          >
            <div className="flex flex-col gap-2 rounded-lg bg-brand-surface p-2">
              <div className="flex items-center justify-between px-1">
                <span className="font-mono-tech text-[11px] uppercase tracking-wider text-zinc-400">
                  Backlog / Todo
                </span>
                <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 font-mono-tech text-[10px] text-zinc-100">
                  2
                </span>
              </div>
              <div className="flex flex-col gap-2 rounded-[3px] bg-brand-surface-muted p-2 shadow-sm">
                <span className="w-fit rounded-[2px] bg-red-400/10 px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-red-300">
                  P0 • Security
                </span>
                <p className="text-xs font-medium text-zinc-100">
                  Rotate AWS KMS root keys
                </p>
                <div className="flex items-center justify-between pt-1 font-mono-tech text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Oct 29
                  </span>
                  <Flag className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-[3px] bg-brand-surface-muted p-2 shadow-sm">
                <span className="w-fit rounded-[2px] bg-white/[0.06] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Documentation
                </span>
                <p className="text-xs font-medium text-zinc-100">
                  Update OpenAPI v3 schema
                </p>
                <div className="flex items-center justify-between pt-1 font-mono-tech text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Nov 02
                  </span>
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-cyan/60 text-[8px] font-bold text-cyan-950">
                    ML
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg bg-brand-surface p-2">
              <div className="flex items-center justify-between px-1">
                <span className="font-mono-tech text-[11px] uppercase tracking-wider text-brand-cyan">
                  In Execution
                </span>
                <span className="rounded-full bg-brand-cyan/10 px-1.5 py-0.5 font-mono-tech text-[10px] text-brand-cyan">
                  1
                </span>
              </div>
              <div className="flex flex-col gap-2 rounded-[3px] bg-gradient-to-br from-brand-surface-muted via-brand-surface-muted to-brand-cyan/5 p-2 shadow-sm">
                <span className="flex w-fit items-center gap-1 rounded-[2px] bg-brand-cyan/10 px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-cyan">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-cyan" />
                  Synthesizing
                </span>
                <p className="text-xs font-medium text-zinc-100">
                  Implement Stripe Webhook listener
                </p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full w-3/4 rounded-full bg-brand-cyan" />
                </div>
                <div className="flex items-center justify-between pt-1 font-mono-tech text-[11px] text-zinc-400">
                  <span className="text-brand-cyan">src/api/webhooks</span>
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-purple text-[8px] font-bold text-white">
                    AK
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg bg-brand-surface p-2">
              <div className="flex items-center justify-between px-1">
                <span className="font-mono-tech text-[11px] uppercase tracking-wider text-brand-green">
                  Shipped
                </span>
                <span className="rounded-full bg-brand-green/10 px-1.5 py-0.5 font-mono-tech text-[10px] text-brand-green">
                  3
                </span>
              </div>
              <div className="flex flex-col gap-2 rounded-[3px] bg-brand-surface-muted p-2 opacity-80 shadow-sm">
                <p className="text-xs font-medium text-zinc-100 line-through decoration-zinc-500">
                  Prisma PostgreSQL Migrations
                </p>
                <div className="flex items-center justify-between font-mono-tech text-[11px] text-brand-green">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                  <span className="text-zinc-400">#481</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-[3px] bg-brand-surface-muted p-2 opacity-80 shadow-sm">
                <p className="text-xs font-medium text-zinc-100 line-through decoration-zinc-500">
                  Workspace Invitation Tokens
                </p>
                <div className="flex items-center justify-between font-mono-tech text-[11px] text-brand-green">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                  <span className="text-zinc-400">#480</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[3px] bg-white/[0.04] px-3 py-1.5 font-mono-tech text-[11px] text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-brand-green">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> Ready
              for traffic
            </span>
            <span className="hidden sm:inline">Next.js 14.2 App Router</span>
          </div>
          <div className="flex items-center gap-1 text-brand-purple-light">
            <span>Auto-seeded 24 dummy tasks</span>
          </div>
        </div>
      </div>
    </div>
  );
}

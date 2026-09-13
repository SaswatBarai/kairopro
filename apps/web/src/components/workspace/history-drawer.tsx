"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCheck,
  CheckCircle2,
  FileDiff,
  Filter,
  GitFork,
  History,
  Info,
  RotateCcw,
  Undo2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

const code = (text: string, tone: "cyan" | "purple" | "green") => (
  <code
    className={cn(
      "rounded-[2px] bg-brand-dark px-1 py-px font-mono-tech text-[11px]",
      tone === "cyan" && "text-brand-cyan",
      tone === "purple" && "text-brand-purple-light",
      tone === "green" && "text-brand-green",
    )}
  >
    {text}
  </code>
);

export interface Checkpoint {
  id: string;
  title: string;
  time: string;
  hash: string;
  added?: string;
  removed?: string;
  summary: ReactNode;
  filesLabel: string;
  viewPath: string;
  viewDiff: boolean;
  tone: "green" | "purple" | "zinc" | "base";
  baseBadge?: "verified" | "committed" | "synthesis";
}

export const CHECKPOINTS: Checkpoint[] = [
  {
    id: "due-date",
    title: "Add due date to tasks",
    time: "2 minutes ago",
    hash: "c4a91b2",
    added: "+32",
    removed: "-6",
    summary: (
      <>
        +1 migration, modified {code("route.ts", "cyan")} &{" "}
        {code("TaskCard.tsx", "purple")} (+32 / -6 lines).
      </>
    ),
    filesLabel: "AST verified",
    viewPath: "app/api/tasks/route.ts",
    viewDiff: true,
    tone: "green",
  },
  {
    id: "validation",
    title: "Fix task creation validation",
    time: "18 minutes ago",
    hash: "8b7f2e4",
    added: "+14",
    removed: "-3",
    summary: (
      <>
        Added Zod schema validation & 400 error handling in{" "}
        {code("route.ts", "cyan")}.
      </>
    ),
    filesLabel: "2 files modified",
    viewPath: "app/api/tasks/route.ts",
    viewDiff: false,
    tone: "green",
    baseBadge: "verified",
  },
  {
    id: "invitations",
    title: "Add team member invitations",
    time: "Yesterday at 4:12 PM",
    hash: "3e1a09d",
    added: "+88",
    removed: "-12",
    summary:
      "NextAuth session check & invite API endpoint with role-based validation.",
    filesLabel: "4 files modified",
    viewPath: "lib/auth.ts",
    viewDiff: false,
    tone: "purple",
    baseBadge: "committed",
  },
  {
    id: "comments",
    title: "Add comment threads",
    time: "2 days ago",
    hash: "7d49b11",
    added: "+62",
    removed: "-4",
    summary: (
      <>
        Schema update: {code("Comment", "green")} model with foreign keys to
        Task and User.
      </>
    ),
    filesLabel: "3 files modified",
    viewPath: "prisma/schema.prisma",
    viewDiff: false,
    tone: "zinc",
    baseBadge: "committed",
  },
  {
    id: "initial",
    title: "Initial build",
    time: "2 days ago",
    hash: "10fc83a",
    summary:
      "PRD compiled into Next.js 14 + Prisma + Tailwind starter repository.",
    filesLabel: "Initial commit",
    viewPath: "prisma/schema.prisma",
    viewDiff: false,
    tone: "base",
    baseBadge: "synthesis",
  },
];

interface HistoryDrawerProps {
  open: boolean;
  currentId: string;
  onClose: () => void;
  onView: (path: string, diff: boolean) => void;
  onUndoCurrent: () => void;
  onRevertTo: (id: string) => void;
}

function Node({
  state,
  tone,
}: {
  state: "current" | "reverted" | "normal";
  tone: Checkpoint["tone"];
}) {
  if (state === "current") {
    return (
      <span className="absolute -left-[24px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-green shadow-[0_0_12px_rgba(78,222,163,0.6)] ring-4 ring-brand-dark">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-dark" />
      </span>
    );
  }
  const border =
    state === "reverted"
      ? "border-zinc-600"
      : tone === "green"
        ? "border-brand-green"
        : tone === "purple"
          ? "border-brand-purple-light"
          : tone === "zinc"
            ? "border-zinc-500"
            : "border-zinc-500/50";
  const dot =
    state === "reverted"
      ? "bg-zinc-600"
      : tone === "green"
        ? "bg-brand-green"
        : tone === "purple"
          ? "bg-brand-purple-light"
          : tone === "zinc"
            ? "bg-zinc-500"
            : "bg-zinc-500/50";
  return (
    <span
      className={cn(
        "absolute -left-[24px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white/[0.03] ring-4 ring-brand-dark",
        border,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
    </span>
  );
}

function Badge({
  state,
  baseBadge,
}: {
  state: "current" | "reverted" | "normal";
  baseBadge?: Checkpoint["baseBadge"];
}) {
  if (state === "current") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full border border-brand-green/30 bg-brand-green/15 px-2 py-0.5 font-mono-tech text-[10px] font-bold uppercase tracking-wider text-brand-green">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-green" />
        Current state
      </span>
    );
  }
  if (state === "reverted") {
    return (
      <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Reverted
      </span>
    );
  }
  if (baseBadge === "verified") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded bg-brand-green/10 px-2 py-0.5 font-mono-tech text-[10px] font-medium text-brand-green">
        <CheckCheck className="h-3 w-3" />
        Verified (24 tests passed)
      </span>
    );
  }
  if (baseBadge === "synthesis") {
    return (
      <span className="shrink-0 rounded border border-brand-purple-light/20 bg-brand-purple-light/10 px-2 py-0.5 font-mono-tech text-[10px] font-medium text-brand-purple-light">
        Base synthesis
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded bg-white/[0.05] px-2 py-0.5 font-mono-tech text-[10px] font-medium text-zinc-400">
      Committed
    </span>
  );
}

export function HistoryDrawer({
  open,
  currentId,
  onClose,
  onView,
  onUndoCurrent,
  onRevertTo,
}: HistoryDrawerProps) {
  const [hideReverted, setHideReverted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const currentIndex = CHECKPOINTS.findIndex((c) => c.id === currentId);
  const canUndo = currentIndex < CHECKPOINTS.length - 1;
  const visible = CHECKPOINTS.filter(
    (_, i) => !(hideReverted && i < currentIndex),
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { duration: 0.25, ease: "easeOut" },
            }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={onClose}
            className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-[3px]"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{
              x: 0,
              transition: { type: "spring", stiffness: 420, damping: 42 },
            }}
            exit={{
              x: "100%",
              transition: { duration: 0.32, ease: [0.4, 0, 1, 1] },
            }}
            className="fixed bottom-0 right-0 top-0 z-[160] flex w-full max-w-[490px] select-none flex-col border-l border-white/[0.08] bg-brand-dark shadow-[0_0_50px_rgba(0,0,0,0.85)]"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.35,
                  ease: "easeOut",
                  delay: 0.08,
                },
              }}
              className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-brand-surface px-5 py-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-brand-purple-light/20 bg-brand-purple-light/10">
                  <History className="h-[19px] w-[19px] text-brand-purple-light" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-100">
                    History &amp; Checkpoints
                  </h2>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono-tech text-[11px] text-zinc-500">
                    <GitFork className="h-3 w-3 text-brand-purple-light" />
                    <span className="font-medium text-zinc-400">
                      feat/taskflow
                    </span>
                    <span className="text-zinc-700">•</span>
                    <span>{CHECKPOINTS.length} checkpoints</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Hide reverted"
                  onClick={() => setHideReverted((v) => !v)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-white/[0.05]",
                    hideReverted
                      ? "text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-100",
                  )}
                >
                  <Filter className="h-[18px] w-[18px]" />
                </button>
                <button
                  type="button"
                  title="Close drawer"
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>
            </motion.div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="relative pl-6">
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{
                    scaleY: 1,
                    transition: {
                      duration: 0.65,
                      ease: "easeOut",
                      delay: 0.18,
                    },
                  }}
                  style={{ transformOrigin: "top" }}
                  className="absolute bottom-8 left-[8px] top-3 w-[2px] bg-gradient-to-b from-brand-green via-brand-purple/40 to-white/[0.08]"
                />
                {visible.map((checkpoint) => {
                  const index = CHECKPOINTS.indexOf(checkpoint);
                  const state =
                    index === currentIndex
                      ? "current"
                      : index < currentIndex
                        ? "reverted"
                        : "normal";
                  const isLast = index === CHECKPOINTS.length - 1;
                  return (
                    <motion.div
                      key={checkpoint.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: {
                          duration: 0.45,
                          ease: [0.21, 0.47, 0.32, 1],
                          delay: 0.12 + index * 0.06,
                        },
                      }}
                      className={cn("relative", !isLast && "pb-6")}
                    >
                      <Node state={state} tone={checkpoint.tone} />
                      <div
                        className={cn(
                          "rounded-[4px] border p-3.5 transition-all",
                          state === "current"
                            ? "border-white/[0.12] bg-brand-surface-muted shadow-sm hover:border-brand-purple/50"
                            : state === "reverted"
                              ? "border-white/[0.06] bg-brand-surface/60 opacity-60"
                              : "border-white/[0.07] bg-brand-surface hover:border-white/[0.15]",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "text-[14px] font-semibold leading-snug",
                              state === "reverted"
                                ? "text-zinc-500 line-through"
                                : "text-zinc-100",
                            )}
                          >
                            {checkpoint.title}
                          </span>
                          <Badge
                            state={state}
                            baseBadge={checkpoint.baseBadge}
                          />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono-tech text-[11px] text-zinc-500">
                          <span>{checkpoint.time}</span>
                          <span className="text-zinc-700">•</span>
                          <span className="rounded-[2px] border border-white/[0.08] bg-white/[0.05] px-1.5 py-px text-[10px] text-zinc-400">
                            {checkpoint.hash}
                          </span>
                          {checkpoint.added && (
                            <>
                              <span className="text-zinc-700">•</span>
                              <span className="font-medium text-brand-green">
                                {checkpoint.added}
                              </span>
                              <span className="font-medium text-rose-400">
                                {checkpoint.removed}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="mt-2 text-[12px] leading-relaxed text-zinc-400">
                          {checkpoint.summary}
                        </p>
                        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
                          {state === "current" ? (
                            <span className="flex items-center gap-1.5 font-mono-tech text-[11px] text-zinc-500">
                              <CheckCircle2 className="h-3.5 w-3.5 text-brand-green" />
                              AST verified
                            </span>
                          ) : (
                            <span className="font-mono-tech text-[11px] text-zinc-500">
                              {checkpoint.filesLabel}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onView(checkpoint.viewPath, checkpoint.viewDiff)
                              }
                              className="flex items-center gap-1 rounded px-2.5 py-1 font-mono-tech text-[11px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
                            >
                              <FileDiff className="h-3 w-3" />
                              View diff
                            </button>
                            {state === "current" ? (
                              <button
                                type="button"
                                onClick={onUndoCurrent}
                                className="flex items-center gap-1 rounded border border-brand-cyan/30 bg-brand-cyan/15 px-2.5 py-1 font-mono-tech text-[11px] font-medium text-brand-cyan shadow-sm transition-colors hover:bg-brand-cyan/25"
                              >
                                <Undo2 className="h-3 w-3" />
                                Undo
                              </button>
                            ) : state === "reverted" ? (
                              <button
                                type="button"
                                onClick={() => onRevertTo(checkpoint.id)}
                                className="flex items-center gap-1 rounded px-2.5 py-1 font-mono-tech text-[11px] font-medium text-brand-purple-light transition-colors hover:bg-brand-purple-light/20"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Restore
                              </button>
                            ) : (
                              !isLast && (
                                <button
                                  type="button"
                                  onClick={() => onRevertTo(checkpoint.id)}
                                  className="flex items-center gap-1 rounded px-2.5 py-1 font-mono-tech text-[11px] font-medium text-brand-purple-light transition-colors hover:bg-brand-purple-light/20"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Revert to this
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.35,
                  ease: "easeOut",
                  delay: 0.14,
                },
              }}
              className="shrink-0 select-none space-y-3.5 border-t border-white/[0.08] bg-brand-surface p-5 shadow-[0_-8px_20px_rgba(0,0,0,0.4)]"
            >
              <button
                type="button"
                onClick={onUndoCurrent}
                disabled={!canUndo}
                className={cn(
                  "group flex w-full items-center justify-center gap-2 rounded-[3px] px-4 py-2.5 text-[13px] font-semibold text-white shadow-md transition-all",
                  canUndo
                    ? "cursor-pointer bg-brand-purple hover:bg-brand-purple/85"
                    : "cursor-default bg-brand-purple/40",
                )}
              >
                <Undo2 className="h-[18px] w-[18px] transition-transform group-hover:-rotate-45" />
                Undo last change
                <kbd className="ml-1.5 rounded bg-white/20 px-1.5 py-0.5 font-mono-tech text-[11px] tracking-wide text-white">
                  ⌘Z
                </kbd>
              </button>
              <div className="flex items-start gap-2 rounded-[3px] border border-white/[0.08] bg-white/[0.03] p-2.5 text-left">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
                <p className="text-[11px] leading-normal text-zinc-400 select-text">
                  Undo restores code to the previous{" "}
                  <strong className="font-medium text-zinc-100">
                    AST checkpoint
                  </strong>
                  . Database schema changes require migration rollback
                  confirmation.
                </p>
              </div>
            </motion.div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

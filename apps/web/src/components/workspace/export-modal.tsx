"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  CheckCircle2,
  Globe,
  Info,
  Loader2,
  Lock,
  Terminal,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

export function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

type ExportPhase = "idle" | "pushing" | "created";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  onExported: (message: string) => void;
}

export function ExportModal({ open, onClose, onExported }: ExportModalProps) {
  const [repoName, setRepoName] = useState("taskflow");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [readme, setReadme] = useState(true);
  const [phase, setPhase] = useState<ExportPhase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    if (open) setPhase("idle");
    return clearTimers;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase === "idle") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, onClose]);

  const dismiss = () => {
    if (phase !== "idle") return;
    onClose();
  };

  const startExport = () => {
    if (phase !== "idle" || !repoName.trim()) return;
    setPhase("pushing");
    timers.current.push(setTimeout(() => setPhase("created"), 1200));
    timers.current.push(
      setTimeout(() => {
        onExported(`Exported to github.com/adalovelace/${repoName}`);
        onClose();
      }, 1950),
    );
  };

  const createLabel = (): ReactNode => {
    if (phase === "pushing")
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Pushing to GitHub...</span>
        </>
      );
    if (phase === "created")
      return (
        <>
          <CheckCircle2 className="h-4 w-4 text-brand-green" />
          <span>Repository created</span>
        </>
      );
    return <span>Create repository</span>;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { duration: 0.25, ease: "easeOut" },
          }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          onClick={dismiss}
          className="fixed inset-0 z-[180] flex items-center justify-center bg-brand-dark/85 p-6 backdrop-blur-[3px]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { type: "spring", stiffness: 360, damping: 32 },
            }}
            exit={{
              opacity: 0,
              scale: 0.97,
              y: 6,
              transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-modal-title"
            className="flex w-full max-w-[480px] flex-col overflow-hidden rounded-[4px] bg-brand-surface shadow-2xl shadow-black/60"
          >
            <div className="flex flex-col gap-1 bg-brand-surface p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GithubMark className="h-5 w-5 text-zinc-100" />
                  <h2
                    id="export-modal-title"
                    className="text-[15px] font-semibold tracking-tight text-zinc-100"
                  >
                    Export to GitHub
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close dialog"
                  onClick={dismiss}
                  className="flex h-7 w-7 items-center justify-center rounded text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>
              <p className="text-[12px] leading-4 text-zinc-300">
                Push this project to a new repository in your GitHub account.
              </p>
            </div>
            <div className="h-px w-full bg-white/[0.08]" />

            <div className="flex flex-col gap-4 bg-brand-surface p-4">
              <div className="flex items-center justify-between rounded bg-white/[0.03] px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded bg-white/[0.1]">
                    <Terminal className="h-4 w-4 text-brand-cyan" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-tech text-[12px] font-semibold text-zinc-100">
                      adalovelace
                    </span>
                    <span className="rounded bg-brand-green/10 px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold text-brand-green">
                      Connected
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-[12px] text-zinc-300 transition-colors hover:text-zinc-100 hover:underline"
                >
                  Change
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="repo-name"
                    className="text-[12px] font-medium text-zinc-100"
                  >
                    Repository name
                  </label>
                  <span className="font-mono-tech text-[10px] text-zinc-300">
                    github.com/adalovelace/{repoName || "taskflow"}
                  </span>
                </div>
                <input
                  id="repo-name"
                  type="text"
                  value={repoName}
                  placeholder="e.g. taskflow-service"
                  spellCheck={false}
                  onChange={(e) =>
                    setRepoName(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-_.]/g, ""),
                    )
                  }
                  className="h-9 w-full rounded bg-brand-dark px-3 font-mono-tech text-[12px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:bg-white/[0.03]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-zinc-100">
                  Visibility
                </span>
                <div
                  role="radiogroup"
                  aria-label="Repository visibility"
                  className="grid grid-cols-2 gap-1 rounded bg-white/[0.03] p-1"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={visibility === "private"}
                    onClick={() => setVisibility("private")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[12px] font-medium transition-colors",
                      visibility === "private"
                        ? "bg-white/[0.1] text-white"
                        : "text-zinc-300 hover:text-zinc-100",
                    )}
                  >
                    <Lock
                      className={cn(
                        "h-[15px] w-[15px]",
                        visibility === "private" && "text-brand-purple-light",
                      )}
                    />
                    Private
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={visibility === "public"}
                    onClick={() => setVisibility("public")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[12px] font-medium transition-colors",
                      visibility === "public"
                        ? "bg-white/[0.1] text-white"
                        : "text-zinc-300 hover:text-zinc-100",
                    )}
                  >
                    <Globe
                      className={cn(
                        "h-[15px] w-[15px]",
                        visibility === "public" && "text-brand-purple-light",
                      )}
                    />
                    Public
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <label className="relative flex cursor-pointer select-none items-center">
                  <input
                    type="checkbox"
                    id="readme-toggle"
                    checked={readme}
                    onChange={(e) => setReadme(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="flex h-4 w-4 items-center justify-center rounded bg-brand-dark transition-colors peer-checked:bg-brand-purple">
                    <Check className="h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                  </div>
                </label>
                <div className="flex flex-col">
                  <label
                    htmlFor="readme-toggle"
                    className="cursor-pointer text-[12px] text-zinc-100"
                  >
                    Include a README with setup instructions
                  </label>
                  <span className="pt-0.5 font-mono-tech text-[11px] text-zinc-300">
                    Initial commit with 34 files • Next.js 14, PostgreSQL
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-1.5 rounded bg-white/[0.03] p-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                <p className="text-[12px] leading-relaxed text-zinc-300">
                  This creates a new {visibility} repository. Existing
                  repositories are never overwritten.
                </p>
              </div>
            </div>
            <div className="h-px w-full bg-white/[0.08]" />

            <div className="flex items-center justify-end gap-2 bg-brand-surface px-4 py-3">
              <button
                type="button"
                onClick={dismiss}
                className="rounded px-3 py-1.5 text-[12px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startExport}
                disabled={phase !== "idle" || !repoName.trim()}
                className={cn(
                  "flex min-w-[168px] items-center justify-center gap-1.5 rounded px-4 py-1.5 text-[13px] font-semibold text-white transition-colors",
                  phase === "idle" && repoName.trim()
                    ? "cursor-pointer bg-brand-purple hover:bg-brand-purple/85"
                    : "cursor-default bg-brand-purple/60",
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={phase}
                    initial={{ y: 6, opacity: 0 }}
                    animate={{
                      y: 0,
                      opacity: 1,
                      transition: { duration: 0.2, ease: "easeOut" },
                    }}
                    exit={{ y: -6, opacity: 0, transition: { duration: 0.12 } }}
                    className="flex items-center gap-1.5"
                  >
                    {createLabel()}
                  </motion.div>
                </AnimatePresence>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

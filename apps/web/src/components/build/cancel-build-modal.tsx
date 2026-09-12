"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Ban,
  CircleMinus,
  Clock,
  History,
  Loader2,
  OctagonX,
  Terminal,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type AbortState = "idle" | "aborting" | "aborted";

const ROLLBACK_ITEMS = [
  {
    icon: CircleMinus,
    iconClass: "text-red-300",
    label: "Prisma schema & migrations:",
    rest: "Pending migration",
    code: "20250519142011_init",
    tail: "will be rolled back from staging sandbox DB.",
    codeClass: "text-brand-purple-light",
  },
  {
    icon: Trash2,
    iconClass: "text-red-300",
    label: "Uncommitted route files:",
    rest: "Synthesized endpoints in",
    code: "src/app/api/*",
    tail: "will be permanently purged from scratch disk.",
    codeClass: "text-zinc-100",
  },
  {
    icon: Clock,
    iconClass: "text-zinc-500",
    label: "Execution quota billed:",
    rest: "",
    code: "00:30s",
    tail: "consumed compute time will be logged against your organization's monthly concurrency plan.",
    codeClass: "text-zinc-100",
  },
];

export function CancelBuildModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [abortState, setAbortState] = useState<AbortState>("idle");
  const [saveLogs, setSaveLogs] = useState(true);
  const [keepApproval, setKeepApproval] = useState(false);

  useEffect(() => {
    if (abortState !== "idle") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abortState, onClose]);

  const onAbort = () => {
    setAbortState("aborting");
    window.setTimeout(() => setAbortState("aborted"), 700);
  };

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      aria-labelledby="cancel-build-title"
      aria-modal="true"
      className="relative z-50 flex w-full max-w-[560px] flex-col overflow-hidden rounded-lg border border-white/[0.1] bg-brand-surface shadow-2xl"
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      role="dialog"
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] bg-white/[0.03] p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[3px] border border-red-400/30 bg-red-400/10">
            {abortState === "aborted" ? (
              <Ban className="h-5 w-5 text-red-300" />
            ) : (
              <TriangleAlert className="h-5 w-5 text-red-300" />
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h2
                className="text-lg font-semibold tracking-tight text-zinc-100"
                id="cancel-build-title"
              >
                {abortState === "aborted"
                  ? "Build #0482 aborted"
                  : "Cancel build #0482?"}
              </h2>
              <span className="rounded-[2px] border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-400">
                {abortState === "aborted" ? "Cancelled" : "Active Process"}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              TaskFlow • Agent worker pool{" "}
              <span className="font-mono-tech text-brand-purple-light">
                us-east-worker-04
              </span>
            </p>
          </div>
        </div>
        {abortState === "idle" && (
          <button
            aria-label="Close dialog"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[3px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
            type="button"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {abortState === "aborted" ? (
        <div className="flex flex-col gap-3 p-4">
          <p className="text-[13px] leading-relaxed text-zinc-100">
            Worker process{" "}
            <span className="font-mono-tech text-xs text-zinc-400">
              PID:82914
            </span>{" "}
            terminated. Database rolled back to clean state.
          </p>
          <p className="font-mono-tech text-[11px] text-zinc-500">
            {saveLogs
              ? "Diagnostic logs & telemetry archived for debugging."
              : "Raw stdout logs discarded — no diagnostic archive created."}
            {keepApproval
              ? " Verified PRD & schema cache kept warm for instant restart."
              : ""}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4 text-left">
          <p className="text-[13px] leading-relaxed text-zinc-100">
            Autonomous synthesis is currently executing{" "}
            <span className="font-mono-tech text-xs font-medium text-brand-cyan">
              Step 3 of 7
            </span>{" "}
            (Creating API routes). Canceling immediately terminates worker
            process{" "}
            <span className="font-mono-tech text-xs text-zinc-400">
              PID:82914
            </span>{" "}
            and initiates atomic rollback of unfinished artifacts.
          </p>

          <div className="flex flex-col gap-2 rounded-[3px] border border-white/[0.08] bg-brand-dark p-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-1">
              <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Immediate Rollback Actions
              </span>
              <span className="flex items-center gap-1 font-mono-tech text-[11px] text-red-300">
                <History className="h-3 w-3" /> Irreversible
              </span>
            </div>
            <ul className="space-y-2.5 text-xs text-zinc-400">
              {ROLLBACK_ITEMS.map((item) => (
                <li className="flex items-start gap-2" key={item.label}>
                  <item.icon
                    className={cn(
                      "mt-0.5 h-4 w-4 flex-shrink-0",
                      item.iconClass,
                    )}
                  />
                  <span>
                    <strong className="font-medium text-zinc-100">
                      {item.label}
                    </strong>{" "}
                    {item.rest}{" "}
                    <span className={`font-mono-tech ${item.codeClass}`}>
                      {item.code}
                    </span>{" "}
                    {item.tail}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <label className="group flex cursor-pointer select-none items-start gap-3">
              <input
                checked={saveLogs}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-purple"
                type="checkbox"
                onChange={() => setSaveLogs((checked) => !checked)}
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-zinc-100 transition-colors group-hover:text-brand-purple-light">
                  Save raw stdout logs &amp; telemetry to diagnostic archives
                </span>
                <span className="font-mono-tech text-[11px] text-zinc-500">
                  Preserves context tokens and model inferences for debugging
                  failure states.
                </span>
              </div>
            </label>
            <label className="group flex cursor-pointer select-none items-start gap-3">
              <input
                checked={keepApproval}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-purple"
                type="checkbox"
                onChange={() => setKeepApproval((checked) => !checked)}
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-zinc-100 transition-colors group-hover:text-brand-purple-light">
                  Keep verified PRD &amp; schema cache for instant restart
                </span>
                <span className="font-mono-tech text-[11px] text-zinc-500">
                  Skips Steps 1 &amp; 2 on subsequent re-runs within the next 4
                  hours.
                </span>
              </div>
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-white/[0.08] bg-brand-dark p-4 sm:flex-row">
        {abortState === "aborted" ? (
          <>
            <div className="flex items-center gap-1.5 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
              <Terminal className="h-3.5 w-3.5" />
              <span>Rollback complete in 0.4s</span>
            </div>
            <button
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[3px] bg-brand-purple px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-violet-500 sm:w-auto"
              type="button"
              onClick={() => router.push("/projects/new")}
            >
              <span>Return to workspace</span>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
              <Terminal className="h-3.5 w-3.5" />
              <span>
                CLI:{" "}
                <code className="normal-case text-zinc-400">
                  kairo build abort 0482
                </code>
              </span>
            </div>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <button
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[3px] border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-[13px] font-medium text-zinc-100 transition-all duration-150 hover:border-zinc-500 hover:bg-white/[0.08] sm:flex-none"
                type="button"
                onClick={onClose}
              >
                <span>Continue build</span>
              </button>
              <button
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-[3px] border border-red-400/30 bg-red-500/90 px-4 py-2 text-[13px] font-medium text-red-50 shadow-sm transition-all duration-150 hover:bg-red-500 sm:flex-none",
                  abortState === "aborting" && "pointer-events-none opacity-80",
                )}
                disabled={abortState === "aborting"}
                type="button"
                onClick={onAbort}
              >
                {abortState === "aborting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Aborting worker...</span>
                  </>
                ) : (
                  <>
                    <OctagonX className="h-4 w-4" />
                    <span>Cancel build &amp; rollback</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

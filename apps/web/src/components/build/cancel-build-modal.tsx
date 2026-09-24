"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { Loader2, TriangleAlert } from "lucide-react";

interface CancelBuildModalProps {
  /** Cancel was sent; the build is finishing the file it is on. */
  stopping: boolean;
  error: string | null;
  onKeep: () => void;
  onConfirm: () => void;
}

export function CancelBuildModal({
  stopping,
  error,
  onKeep,
  onConfirm,
}: CancelBuildModalProps) {
  useEffect(() => {
    if (stopping) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onKeep();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stopping, onKeep]);

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      aria-labelledby="cancel-build-title"
      aria-modal="true"
      className="relative z-50 flex w-full max-w-[420px] flex-col gap-4 rounded-lg border border-white/[0.1] bg-brand-surface p-5 shadow-2xl"
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      role="dialog"
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-amber-400/30 bg-amber-400/10">
          <TriangleAlert className="h-5 w-5 text-amber-300" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2
            className="text-lg font-semibold tracking-tight text-zinc-100"
            id="cancel-build-title"
          >
            Cancel this build?
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            {stopping
              ? "Finishing the file it is writing, then stopping."
              : "KairoPro will stop after the file it is writing. Everything generated so far is kept."}
          </p>
        </div>
      </div>

      {error && (
        <p
          className="rounded-[3px] border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-zinc-300"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          className="cursor-pointer rounded-[3px] px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={stopping}
          type="button"
          onClick={onKeep}
        >
          Keep building
        </button>
        <button
          className="flex cursor-pointer items-center gap-2 rounded-[3px] bg-rose-500/90 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={stopping}
          type="button"
          onClick={onConfirm}
        >
          {stopping && <Loader2 className="h-4 w-4 animate-spin" />}
          {stopping ? "Stopping…" : "Cancel build"}
        </button>
      </div>
    </motion.div>
  );
}

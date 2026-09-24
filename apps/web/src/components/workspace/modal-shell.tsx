"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface ModalShellProps {
  open: boolean;
  title: string;
  /** Id of the heading, for `aria-labelledby`. */
  titleId: string;
  icon: ReactNode;
  /** While true the dialog can't be dismissed — a request is in flight. */
  locked?: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** The dialog chrome the workspace's modals share: backdrop, Escape and
 * click-outside to dismiss (unless locked), header with a close button. */
export function ModalShell({
  open,
  title,
  titleId,
  icon,
  locked = false,
  onClose,
  children,
}: ModalShellProps) {
  useEffect(() => {
    if (!open || locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, locked, onClose]);

  const dismiss = () => {
    if (!locked) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2 } }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          onClick={dismiss}
          className="fixed inset-0 z-[180] flex items-center justify-center bg-brand-dark/80 p-6 backdrop-blur-[3px]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-[8px] bg-brand-surface p-6 shadow-2xl shadow-black/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-purple-light/10 text-brand-purple-light">
                  {icon}
                </div>
                <h2
                  id={titleId}
                  className="text-[18px] font-semibold leading-6 tracking-tight text-zinc-100"
                >
                  {title}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                disabled={locked}
                onClick={dismiss}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/[0.05] text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

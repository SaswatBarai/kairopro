"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  Copy,
  GitCommit,
  Lock,
  Network,
  Server,
  Share,
  ShieldCheck,
  Terminal,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

const DEPLOYMENT_ID = "dep_8f29c01a";
const ROLLBACK_ID = "dep_7e12b90";

interface DeploySuccessModalProps {
  open: boolean;
  url: string;
  onClose: () => void;
  onOpenLogs: () => void;
}

export function DeploySuccessModal({
  open,
  url,
  onClose,
  onOpenLogs,
}: DeploySuccessModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopiedUrl(false);
      setCopiedId(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
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
          onClick={onClose}
          className="fixed inset-0 z-[180] flex items-center justify-center bg-brand-dark/80 p-6 backdrop-blur-[3px]"
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
            aria-labelledby="deploy-live-title"
            className="flex w-full max-w-[540px] flex-col overflow-hidden rounded-[8px] border border-white/[0.08] bg-brand-surface text-zinc-100 shadow-2xl shadow-black/60"
          >
            <div className="flex items-start justify-between p-4 pb-2">
              <div className="flex items-start gap-3">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    transition: {
                      type: "spring",
                      stiffness: 380,
                      damping: 18,
                      delay: 0.1,
                    },
                  }}
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-green/40 bg-brand-green/10 text-brand-green shadow-[0_0_12px_rgba(78,222,163,0.25)]"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-green">
                    <Check
                      className="h-3.5 w-3.5 text-brand-dark"
                      strokeWidth={3}
                    />
                  </span>
                </motion.div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2
                      id="deploy-live-title"
                      className="text-[15px] font-semibold tracking-tight text-zinc-100"
                    >
                      Deployment live
                    </h2>
                    <span className="rounded border border-brand-green/30 bg-brand-green/15 px-2 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-green">
                      Active
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-4 text-zinc-300">
                    TaskFlow is now live on the Kairo Edge Network.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={onClose}
                className="rounded p-1 text-zinc-300 transition-colors hover:text-zinc-100"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="flex flex-col gap-3 px-4 pb-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.35,
                    ease: "easeOut",
                    delay: 0.12,
                  },
                }}
                className="relative flex flex-col gap-3 overflow-hidden rounded-lg border border-brand-green/30 bg-brand-dark p-3.5 shadow-inner"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wide text-brand-green">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute h-2 w-2 animate-ping rounded-full bg-brand-green opacity-75" />
                      <span className="relative h-2 w-2 rounded-full bg-brand-green" />
                    </span>
                    Production Edge URL
                  </div>
                  <span className="flex items-center gap-1 font-mono-tech text-[10px] font-medium text-zinc-300">
                    <Lock className="h-3 w-3 text-brand-green" />
                    TLS 1.3
                  </span>
                </div>
                <div className="flex flex-col justify-between gap-2.5 rounded bg-white/[0.03] px-3 py-2 sm:flex-row sm:items-center">
                  <span className="select-all truncate font-mono-tech text-[13px] font-medium text-brand-purple-light">
                    {url}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      title="Copy to clipboard"
                      onClick={() => {
                        copyText(url);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      className={cn(
                        "flex h-7 items-center gap-1 rounded border border-white/[0.08] bg-white/[0.05] px-2.5 font-mono-tech text-[11px] transition-all hover:bg-white/[0.08] active:scale-95",
                        copiedUrl ? "text-brand-green" : "text-zinc-100",
                      )}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedUrl ? "Copied!" : "Copy"}
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-7 items-center gap-1 rounded bg-brand-purple px-3 font-mono-tech text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-purple/85"
                    >
                      Visit
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.35,
                    ease: "easeOut",
                    delay: 0.18,
                  },
                }}
                className="grid grid-cols-2 gap-2 text-left sm:grid-cols-3"
              >
                <div className="flex flex-col gap-1 rounded border border-white/[0.06] bg-white/[0.03] p-2.5">
                  <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Deployment ID
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tech text-[11px] font-medium text-zinc-100">
                      {DEPLOYMENT_ID}
                    </span>
                    <button
                      type="button"
                      title="Copy deployment hash"
                      onClick={() => {
                        copyText(DEPLOYMENT_ID);
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 1500);
                      }}
                      className="text-zinc-300 transition-colors hover:text-brand-purple-light"
                    >
                      {copiedId ? (
                        <Check className="h-3 w-3 text-brand-green" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1 rounded border border-white/[0.06] bg-white/[0.03] p-2.5">
                  <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Branch / Commit
                  </span>
                  <div className="flex items-center gap-1.5 truncate">
                    <GitCommit className="h-3 w-3 shrink-0 text-brand-cyan" />
                    <span className="truncate font-mono-tech text-[11px] text-zinc-100">
                      feat/taskflow
                    </span>
                    <span className="font-mono-tech text-[11px] text-zinc-500">
                      4b9e271
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 rounded border border-white/[0.06] bg-white/[0.03] p-2.5">
                  <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Build Duration
                  </span>
                  <div className="flex items-center gap-1 text-brand-green">
                    <Zap className="h-3.5 w-3.5" />
                    <span className="font-mono-tech text-[11px] font-semibold">
                      38s
                    </span>
                    <span className="ml-auto font-mono-tech text-[10px] font-medium text-zinc-500">
                      Fast
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 rounded border border-white/[0.06] bg-white/[0.03] p-2.5">
                  <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Environment
                  </span>
                  <div className="flex items-center gap-1.5 font-mono-tech text-[11px] text-zinc-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
                    Global Edge (V8)
                  </div>
                </div>
                <div className="flex flex-col gap-1 rounded border border-white/[0.06] bg-white/[0.03] p-2.5 sm:col-span-2">
                  <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Edge Status &amp; Mesh
                  </span>
                  <div className="flex items-center justify-between font-mono-tech text-[11px] text-brand-green">
                    <div className="flex items-center gap-1.5">
                      <Network className="h-3.5 w-3.5" />
                      24/24 PoPs Synced
                    </div>
                    <span className="font-mono-tech text-[10px] font-medium text-zinc-300">
                      100% healthy
                    </span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.3, delay: 0.24 },
                }}
                className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-zinc-300"
              >
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <button
                    type="button"
                    onClick={onOpenLogs}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                  >
                    <Terminal className="h-[15px] w-[15px]" />
                    Build logs
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                  >
                    <Server className="h-[15px] w-[15px]" />
                    Custom domain
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                  >
                    <Share className="h-[15px] w-[15px]" />
                    Share preview
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.3, delay: 0.28 },
                }}
                className="-mx-4 -mb-4 mt-1 flex flex-col justify-between gap-3 border-t border-white/[0.08] bg-brand-dark/50 px-4 py-3 sm:flex-row sm:items-center"
              >
                <div className="flex max-w-[340px] items-center gap-1.5 text-[11px] leading-tight text-zinc-500">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-green" />
                  <span>
                    Zero downtime cutover. Rollback ready to{" "}
                    <span className="font-mono-tech text-[11px] text-zinc-100">
                      {ROLLBACK_ID}
                    </span>
                    .
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 shrink-0 rounded border border-white/[0.08] bg-white/[0.05] px-4 text-[15px] font-semibold text-zinc-100 transition-colors hover:bg-white/[0.08]"
                >
                  Done
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

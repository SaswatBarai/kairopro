"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck,
  CheckCircle2,
  GitMerge,
  Globe,
  Info,
  Loader2,
  Lock,
  Rocket,
  ShieldCheck,
  Timer,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores";

const DEPLOY_STEPS = [
  { message: "Dispatching build image to us-east-1", progress: 33 },
  { message: "Building Next.js 14 distribution container...", progress: 66 },
  { message: "Allocating SSL certificates and edge routing...", progress: 88 },
  { message: "Deployment complete! Route online.", progress: 100 },
];

const PREFLIGHT = [
  "TypeScript typecheck pass",
  "24 unit & e2e suites ok",
  "Migration schema locked",
  "4 secrets verified",
];

interface DeployModalProps {
  open: boolean;
  onClose: () => void;
  onDeployed: (url: string) => void;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

export function DeployModal({ open, onClose, onDeployed }: DeployModalProps) {
  const activeProjectName = useProjectStore((s) => s.activeProjectName);
  const [subdomain, setSubdomain] = useState(() =>
    slugify(activeProjectName ?? "project"),
  );
  const [deploying, setDeploying] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const step = DEPLOY_STEPS[stepIndex];
  const done = stepIndex === DEPLOY_STEPS.length - 1;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    if (open) {
      setDeploying(false);
      setStepIndex(0);
      setSubdomain(slugify(activeProjectName ?? "project"));
    }
    return clearTimers;
  }, [open, activeProjectName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deploying) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, deploying, onClose]);

  const dismiss = () => {
    if (deploying) return;
    onClose();
  };

  const startDeploy = () => {
    if (deploying || !subdomain.trim()) return;
    setDeploying(true);
    setStepIndex(0);
    DEPLOY_STEPS.forEach((_, i) => {
      if (i === 0) return;
      timers.current.push(
        setTimeout(() => setStepIndex(i), 300 + (i - 1) * 1400),
      );
    });
    timers.current.push(
      setTimeout(
        () => {
          onDeployed(`https://${subdomain}.kairopro.app`);
          onClose();
        },
        300 + (DEPLOY_STEPS.length - 1) * 1400 + 1500,
      ),
    );
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
            aria-labelledby="deploy-modal-title"
            className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-[560px] flex-col gap-4 overflow-y-auto rounded-[8px] bg-brand-surface p-6 shadow-2xl shadow-black/60"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-purple-light/10 text-brand-purple-light">
                  <Rocket className="h-6 w-6" />
                </div>
                <div>
                  <h2
                    id="deploy-modal-title"
                    className="text-[20px] font-semibold leading-7 tracking-tight text-zinc-100"
                  >
                    Deploy to production
                  </h2>
                  <p className="mt-0.5 text-[12px] leading-4 text-zinc-300">
                    Ship{" "}
                    <span className="font-mono-tech text-[11px] text-zinc-100">
                      {activeProjectName ?? "this project"}
                    </span>{" "}
                    to Kairo Edge Network with zero-downtime routing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={dismiss}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/[0.05] text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="subdomain-input"
                    className="font-mono-tech text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500"
                  >
                    Production endpoint
                  </label>
                  <span className="flex items-center gap-1 font-mono-tech text-[10px] font-semibold text-brand-green">
                    <BadgeCheck className="h-3 w-3" />
                    Available &amp; Reserved
                  </span>
                </div>
                <div className="flex items-center rounded bg-brand-dark px-3 py-1.5 focus-within:ring-1 focus-within:ring-brand-purple-light">
                  <span className="mr-1 select-none font-mono-tech text-[12px] text-zinc-500">
                    https://
                  </span>
                  <input
                    id="subdomain-input"
                    type="text"
                    value={subdomain}
                    onChange={(e) =>
                      setSubdomain(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      )
                    }
                    className="w-24 shrink-0 bg-transparent font-mono-tech text-[12px] font-medium tracking-tight text-zinc-100 outline-none"
                  />
                  <span className="select-none font-mono-tech text-[12px] font-medium text-brand-cyan">
                    .kairopro.app
                  </span>
                  <div className="ml-auto flex items-center gap-1 rounded bg-brand-green/10 px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold text-brand-green">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-green" />
                    Live DNS
                  </div>
                </div>
                <p className="flex items-center gap-1 text-[12px] leading-4 text-zinc-500">
                  <Info className="h-[13px] w-[13px] shrink-0" />
                  Custom apex domains and vanity CNAMEs can be configured
                  post-launch.
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-lg bg-white/[0.03] p-3">
                <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Pipeline topology &amp; specs
                </span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono-tech text-[11px]">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Target cluster
                    </span>
                    <span className="flex items-center gap-1 text-[12px] text-zinc-100">
                      <Globe className="h-3.5 w-3.5 text-brand-cyan" />
                      us-east-1 (Anycast Global)
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Target ref
                    </span>
                    <span className="flex items-center gap-1 text-zinc-100">
                      <GitMerge className="h-3.5 w-3.5 text-brand-purple-light" />
                      feat/taskflow → main
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Data layer
                    </span>
                    <span className="truncate text-zinc-100">
                      Neon PG (v1.4 Synced)
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Build engine
                    </span>
                    <span className="truncate text-zinc-100">
                      Next.js 14 (Turbopack)
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-1.5 rounded bg-brand-dark px-2 py-1 font-mono-tech text-[11px] text-zinc-400">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-brand-green" />
                  <span className="text-zinc-100">
                    Auto-provisioned TLS 1.3:
                  </span>
                  <span className="text-zinc-500">
                    Let&apos;s Encrypt Wildcard (*.kairopro.app)
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between font-mono-tech text-[10px] font-semibold">
                  <span className="uppercase tracking-[0.08em] text-zinc-500">
                    Pre-flight validation (4/4 passed)
                  </span>
                  <span className="text-brand-green">Ready for execution</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[12px]">
                  {PREFLIGHT.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-1.5 truncate rounded bg-white/[0.03] px-2 py-1 text-zinc-100"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-green" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded bg-brand-dark px-2 py-1.5 font-mono-tech text-[11px] font-medium tracking-[0.03em] text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-brand-cyan" />
                  Estimated compile runtime
                </span>
                <span className="text-[12px] font-semibold text-zinc-100">
                  ≈ 42 seconds
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded bg-white/[0.08] px-3 py-2 text-[13px] text-zinc-100 transition-colors hover:bg-white/[0.12]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={startDeploy}
                  disabled={!subdomain.trim()}
                  className={cn(
                    "group flex items-center gap-2 rounded px-6 py-2 text-[15px] font-semibold shadow-md transition-all",
                    subdomain.trim()
                      ? "cursor-pointer bg-brand-purple text-white hover:bg-brand-purple/85"
                      : "cursor-default bg-brand-purple/40 text-white",
                  )}
                >
                  <Zap className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  Confirm &amp; Deploy
                </button>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-center font-mono-tech text-[10px] font-semibold tracking-[0.05em] text-zinc-500">
                <ShieldCheck className="h-[13px] w-[13px] text-brand-green" />
                Zero-downtime deployment. Traffic shifts instantly when health
                checks pass.
              </div>
            </div>

            <AnimatePresence>
              {deploying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: { duration: 0.25, ease: "easeOut" },
                  }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-[8px] bg-brand-surface/95 p-6 backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      transition: {
                        type: "spring",
                        stiffness: 320,
                        damping: 22,
                      },
                    }}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full",
                      done
                        ? "bg-brand-green/20 text-brand-green"
                        : "bg-brand-purple/20 text-brand-purple-light",
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-7 w-7" />
                    ) : (
                      <Loader2 className="h-7 w-7 animate-spin" />
                    )}
                  </motion.div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="text-[15px] font-semibold text-zinc-100">
                      Triggering Edge Pipeline...
                    </div>
                    <div className="h-4 overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={stepIndex}
                          initial={{ y: 8, opacity: 0 }}
                          animate={{
                            y: 0,
                            opacity: 1,
                            transition: {
                              duration: 0.25,
                              ease: "easeOut",
                            },
                          }}
                          exit={{
                            y: -8,
                            opacity: 0,
                            transition: { duration: 0.15 },
                          }}
                          className={cn(
                            "font-mono-tech text-[11px]",
                            done ? "text-brand-green" : "text-zinc-400",
                          )}
                        >
                          {step?.message}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="mt-1 h-1 w-64 overflow-hidden rounded-full bg-white/[0.1]">
                    <motion.div
                      animate={{
                        width: `${step?.progress ?? 0}%`,
                        backgroundColor: done ? "#4edea3" : "#6d5ef5",
                      }}
                      transition={{
                        width: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
                        backgroundColor: { duration: 0.4 },
                      }}
                      className="h-full rounded-full"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { CheckCircle2, Terminal } from "lucide-react";
import { motion, type Variants } from "motion/react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

const buildSteps = [
  { label: "Understanding requirements", time: "2s", done: true },
  { label: "Generating database schema", time: "6s", done: true },
  { label: "Creating API routes", time: null, done: false },
];

const terminalLines: { text: string; cls: string; cursor?: boolean }[] = [
  { text: "Creating file src/app/api/tasks/route.ts", cls: "text-zinc-100" },
  { text: "Writing prisma/schema.prisma", cls: "text-zinc-100" },
  { text: "Running: npm install", cls: "font-medium text-brand-green" },
  { text: "added 412 packages in 18s", cls: "text-zinc-500" },
  {
    text: "Running: npx prisma migrate dev",
    cls: "font-medium text-brand-purple-light",
  },
  { text: "Migration applied: 20240115_init", cls: "text-brand-green" },
  { text: "Generating Prisma Client...", cls: "text-zinc-100", cursor: true },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

const stepsContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.35, delayChildren: 0.55 } },
};

const terminalContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 1.55 } },
};

const streamLine: Variants = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export function AuthProofPanel() {
  return (
    <div className="relative hidden w-full flex-col items-center justify-center overflow-hidden bg-brand-surface-muted p-8 lg:flex">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-15 [background-image:linear-gradient(to_right,#474555_1px,transparent_1px),linear-gradient(to_bottom,#474555_1px,transparent_1px)] [background-size:32px_32px]"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex w-full max-w-[480px] flex-col gap-4"
      >
        <motion.div
          variants={item}
          className="flex items-center justify-between rounded-[3px] border border-white/[0.06] bg-brand-surface px-3 py-1.5"
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse-cyan rounded-full bg-brand-cyan" />
            <span className="font-mono-tech text-[11px] uppercase tracking-wider text-brand-cyan">
              kairo_pipeline // instant_reconnect
            </span>
          </div>
          <span className="font-mono-tech text-[10px] uppercase tracking-wide text-zinc-500">
            node_us_east_1
          </span>
        </motion.div>

        <motion.div variants={item}>
          <Card className="gap-0 overflow-hidden rounded-[4px] border-white/[0.08] bg-brand-surface py-0 shadow-2xl shadow-black/40">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-white/[0.06] bg-brand-surface-muted px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-brand-purple-light" />
                <span className="text-sm font-medium text-zinc-100">
                  Active Build • TaskFlow
                </span>
              </div>
              <span className="rounded-[3px] bg-brand-dark px-1.5 py-0.5 font-mono-tech text-[10px] uppercase tracking-wide text-zinc-400">
                stage: isolated_sandbox
              </span>
            </CardHeader>

            <CardContent className="p-3">
              <motion.div
                variants={stepsContainer}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-1.5"
              >
                {buildSteps.map((step) =>
                  step.done ? (
                    <motion.div
                      key={step.label}
                      variants={streamLine}
                      className="flex items-center justify-between rounded-[3px] bg-brand-dark px-2 py-1.5"
                    >
                      <span className="flex items-center gap-2 text-xs text-zinc-100">
                        <CheckCircle2 className="h-4 w-4 text-brand-green" />
                        {step.label}
                      </span>
                      <span className="font-mono-tech text-[11px] text-zinc-500">
                        {step.time}
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={step.label}
                      variants={streamLine}
                      className="flex items-center justify-between rounded-[3px] bg-brand-purple/10 px-2 py-1.5"
                    >
                      <span className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
                        <span className="relative flex h-4 w-4 items-center justify-center">
                          <span className="absolute h-2 w-2 animate-ping rounded-full bg-brand-cyan" />
                          <span className="h-2 w-2 rounded-full bg-brand-cyan" />
                        </span>
                        {step.label}
                      </span>
                      <span className="rounded-[3px] bg-brand-cyan/10 px-1.5 py-0.5 font-mono-tech text-[10px] tracking-tight text-brand-cyan">
                        in progress
                      </span>
                    </motion.div>
                  ),
                )}
              </motion.div>
            </CardContent>

            <div className="flex flex-col bg-brand-dark">
              <div className="flex items-center justify-between bg-brand-surface-muted px-3 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-green/60" />
                </div>
                <span className="font-mono-tech text-[11px] text-zinc-500">
                  terminal — /app/sandbox (zsh)
                </span>
                <span aria-hidden="true" className="w-2.5" />
              </div>
              <motion.div
                variants={terminalContainer}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-0.5 p-3 font-mono-tech text-[11px] leading-relaxed text-zinc-400"
              >
                {terminalLines.map((line, index) => (
                  <motion.div
                    key={line.text}
                    variants={streamLine}
                    className="flex items-center gap-2"
                  >
                    <span className="select-none text-zinc-600">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={line.cls}>
                      {line.text}
                      {line.cursor && (
                        <span className="ml-1 inline-block h-3.5 w-[7px] animate-pulse bg-brand-cyan" />
                      )}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          variants={item}
          className="flex items-center justify-between px-1 font-mono-tech text-[11px] text-zinc-500"
        >
          <span>Deterministic generation. Real code you own.</span>
          <span className="text-brand-cyan/70">Zero lock-in.</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

"use client";

import { Boxes, CircleOff, Lock, ShieldCheck, Terminal } from "lucide-react";
import { motion, type Variants } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const bootstrapSteps = [
  { label: "Provision isolated micro-VM sandbox", time: "0.4s", done: true },
  {
    label: "Mount Next.js 15 App Router + Tailwind v4 runtime",
    time: "1.2s",
    done: true,
  },
  {
    label: "Attach PostgreSQL & Prisma ORM database pipeline",
    time: "0.8s",
    done: true,
  },
  {
    label: "Ready for PRD / Schema ingestion (listening on websocket)",
    time: null,
    done: false,
  },
];

const terminalLines: { tag: string; tagCls: string; text: string }[] = [
  {
    tag: "[auth]",
    tagCls: "text-brand-purple-light",
    text: "Verified developer workspace token & credentials",
  },
  {
    tag: "[env]",
    tagCls: "text-brand-cyan",
    text: "Generating isolated ephemeral sandbox sbx_89f02c",
  },
  {
    tag: "[git]",
    tagCls: "text-brand-green",
    text: "Initialized upstream Git repository with MIT license boilerplates",
  },
  {
    tag: "[engine]",
    tagCls: "text-[#C5C0FF]",
    text: "AI Agent pipeline standby: Claude reasoning engine active",
  },
];

const metrics = [
  { label: "Sandbox Init", value: "0.42s", valueCls: "text-zinc-100" },
  {
    label: "Context Window",
    value: "200k tokens",
    valueCls: "text-brand-cyan",
  },
  { label: "Stack Latency", value: "18ms p99", valueCls: "text-brand-green" },
];

const pills = [
  { icon: ShieldCheck, label: "100% Code Ownership" },
  { icon: Lock, label: "Zero Data Retention" },
  { icon: CircleOff, label: "No Credit Card Required" },
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
  show: { transition: { staggerChildren: 0.3, delayChildren: 0.55 } },
};

const terminalContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.16, delayChildren: 1.7 } },
};

const streamLine: Variants = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export function RegisterProofPanel() {
  return (
    <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-brand-surface-muted p-6 lg:flex lg:p-8">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex w-full flex-col gap-4"
      >
        <motion.div
          variants={item}
          className="flex items-center justify-between rounded-[3px] border border-white/[0.06] bg-brand-surface px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-ping rounded-full bg-brand-cyan" />
            <span className="font-mono-tech text-[11px] uppercase tracking-wider text-brand-cyan">
              kairo_engine // provisioning_environment
            </span>
          </div>
          <span className="rounded-[3px] bg-brand-surface-muted px-1.5 py-0.5 font-mono-tech text-[10px] uppercase tracking-wide text-zinc-400">
            cluster: aws_us_east_1
          </span>
        </motion.div>

        <motion.div variants={item}>
          <Card className="gap-0 rounded-[4px] border-white/[0.08] bg-brand-surface py-0 shadow-2xl shadow-black/40">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <Boxes className="h-4 w-4 text-brand-cyan" />
                <span className="text-sm font-medium text-zinc-100">
                  Instant Project Bootstrap
                </span>
              </div>
              <Badge variant="cyan" mono>
                stage: docker_container_initialized
              </Badge>
            </CardHeader>

            <CardContent className="p-3">
              <motion.div
                variants={stepsContainer}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-1.5 font-mono-tech text-[11px]"
              >
                {bootstrapSteps.map((step) =>
                  step.done ? (
                    <motion.div
                      key={step.label}
                      variants={streamLine}
                      className="flex items-center justify-between rounded-[3px] bg-white/[0.03] px-2 py-1.5"
                    >
                      <span className="flex items-center gap-2 text-zinc-100">
                        <ShieldCheck className="h-3.5 w-3.5 text-brand-green" />
                        {step.label}
                      </span>
                      <span className="text-brand-green">{step.time}</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={step.label}
                      variants={streamLine}
                      className="flex items-center justify-between rounded-[3px] bg-brand-cyan/5 px-2 py-1.5"
                    >
                      <span className="flex items-center gap-2 text-brand-cyan">
                        <span className="h-2 w-2 animate-pulse-cyan rounded-full bg-brand-cyan" />
                        {step.label}
                      </span>
                      <span className="rounded-[3px] bg-brand-cyan/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-brand-cyan">
                        live
                      </span>
                    </motion.div>
                  ),
                )}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="gap-0 overflow-hidden rounded-[4px] border-white/[0.08] bg-brand-surface py-0 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between bg-brand-surface-muted px-3 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-green/60" />
                <span className="ml-2 font-mono-tech text-[11px] text-zinc-500">
                  kairo-daemon v2.4.0 --ready
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <span className="font-mono-tech text-[10px] uppercase tracking-wide">
                  port: 4421
                </span>
                <Terminal className="h-3.5 w-3.5" />
              </div>
            </div>
            <motion.div
              variants={terminalContainer}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-1.5 p-3 font-mono-tech text-xs text-zinc-400"
            >
              {terminalLines.map((line, index) => (
                <motion.div
                  key={line.tag}
                  variants={streamLine}
                  className="flex items-baseline gap-3"
                >
                  <span className="select-none text-[11px] text-zinc-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={line.tagCls}>{line.tag}</span>
                  <span className="text-zinc-100">{line.text}</span>
                </motion.div>
              ))}
              <motion.div
                variants={streamLine}
                className="flex items-baseline gap-3 pt-1"
              >
                <span className="select-none text-[11px] text-zinc-600">
                  05
                </span>
                <span className="text-brand-green">[ready]</span>
                <span className="flex items-center gap-1 font-semibold text-zinc-100">
                  System idle. Ready for your first prompt or PRD document
                  <span className="ml-1 inline-block h-3.5 w-2 animate-pulse bg-brand-cyan" />
                </span>
              </motion.div>
            </motion.div>
          </Card>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-3 gap-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col rounded-[3px] bg-brand-surface p-2.5"
            >
              <span className="font-mono-tech text-[10px] uppercase tracking-wide text-zinc-500">
                {metric.label}
              </span>
              <span
                className={`font-mono-tech text-sm font-semibold ${metric.valueCls}`}
              >
                {metric.value}
              </span>
            </div>
          ))}
        </motion.div>

        <motion.div
          variants={item}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          {pills.map((pill) => (
            <span
              key={pill.label}
              className="flex items-center gap-1.5 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-400"
            >
              <pill.icon className="h-4 w-4 text-brand-green" />
              {pill.label}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

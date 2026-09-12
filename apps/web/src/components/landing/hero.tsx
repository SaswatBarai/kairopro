"use client";

import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { PipelineVisualization } from "@/components/landing/pipeline-visualization";

const heroVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay,
      ease: [0.21, 0.47, 0.32, 0.98] as const,
    },
  }),
};

export function Hero() {
  return (
    <section className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-12 text-center">
      {/* Telemetry status pill */}
      <motion.div
        custom={0}
        variants={heroVariants}
        initial="hidden"
        animate="visible"
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-brand-surface-muted px-3 py-1 shadow-inner"
      >
        <span className="h-1.5 w-1.5 animate-pulse-cyan rounded-full bg-brand-cyan" />
        <span className="font-mono-tech text-[11px] font-medium uppercase tracking-wide text-[#e4e1e9]">
          AUTONOMOUS COMPILER ONLINE
        </span>
        <span className="ml-0.5 border-l border-white/[0.08] pl-2 font-mono-tech text-[10px] text-zinc-500">
          LATENCY: 14ms
        </span>
      </motion.div>

      {/* Massive cinematic headline */}
      <motion.h1
        custom={0.1}
        variants={heroVariants}
        initial="hidden"
        animate="visible"
        className="mb-8 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-zinc-100 sm:text-7xl lg:text-[88px]"
      >
        YOUR SPECIFICATION.
        <br />
        <span className="bg-gradient-to-r from-brand-purple-light via-[#C5C0FF] to-white bg-clip-text text-transparent">
          WORKING SOFTWARE.
        </span>
      </motion.h1>

      <motion.p
        custom={0.2}
        variants={heroVariants}
        initial="hidden"
        animate="visible"
        className="mb-10 max-w-2xl text-base font-normal leading-relaxed tracking-tight text-zinc-400 sm:text-lg"
      >
        KairoPro reads your product specification, designs the architecture,
        writes the code, runs the application, fixes failures, and ships it.
      </motion.p>

      {/* Action CTA row */}
      <motion.div
        custom={0.3}
        variants={heroVariants}
        initial="hidden"
        animate="visible"
        className="mb-20 flex flex-wrap items-center justify-center gap-4"
      >
        <Button asChild>
          <a href="#">
            <span>Start building</span>
            <span>→</span>
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href="#spec-to-software">See how it works</a>
        </Button>
      </motion.div>

      {/* Interactive compiler visualization */}
      <motion.div
        custom={0.4}
        variants={heroVariants}
        initial="hidden"
        animate="visible"
        className="w-full"
      >
        <PipelineVisualization />
      </motion.div>
    </section>
  );
}

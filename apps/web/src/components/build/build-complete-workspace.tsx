"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, FolderOpen, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { AgentDecisions } from "./agent-decisions";
import { BuildLogsDrawer } from "./build-logs-drawer";
import { PipelineChecklist } from "./pipeline-checklist";
import { PreviewFrame } from "./preview-frame";
import { TelemetryPanel } from "./telemetry-panel";

export function BuildCompleteWorkspace() {
  const [logsOpen, setLogsOpen] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  const toggleLogs = () => {
    const next = !logsOpen;
    setLogsOpen(next);
    if (next) {
      window.setTimeout(() => {
        logsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 60);
    }
  };

  return (
    <div className="flex w-full flex-col">
      <section className="w-full border-b border-white/[0.08] bg-brand-surface px-6 py-3">
        <div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono-tech text-xs text-zinc-400">
              <span className="cursor-pointer transition-colors hover:text-zinc-100">
                Projects
              </span>
              <span className="text-zinc-600">/</span>
              <span className="cursor-pointer transition-colors hover:text-zinc-100">
                TaskFlow
              </span>
              <span className="text-zinc-600">/</span>
              <span className="font-semibold text-brand-purple-light">
                Build #0482
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-brand-green/10 px-2 py-0.5 font-mono-tech text-[10px] uppercase tracking-wider text-brand-green">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-green" />
              <span>Build Completed</span>
            </div>
            <div className="hidden items-center gap-2 font-mono-tech text-[11px] text-zinc-400 lg:flex">
              <span className="font-medium text-zinc-100">1m 42s</span>
              <span className="text-zinc-600">•</span>
              <span>7/7 steps passed</span>
              <span className="text-zinc-600">•</span>
              <span className="font-medium text-brand-green">0 errors</span>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-[3px] bg-brand-surface-muted px-3 py-1 text-[13px] text-zinc-100 transition-colors hover:bg-white/[0.08]"
              type="button"
              onClick={toggleLogs}
            >
              <Terminal className="h-4 w-4 text-zinc-400" />
              <span>{logsOpen ? "Hide logs" : "View logs"}</span>
            </button>
            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-[3px] bg-brand-surface-muted px-3 py-1 text-[13px] text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
              type="button"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Workspace</span>
            </button>
            <a
              className="shadow-md"
              href="https://taskflow-preview-0482.kairo.dev"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Button className="h-auto gap-1.5 px-3 py-1 text-[13px] font-semibold">
                <span>Open preview</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <PreviewFrame />
          </div>
          <div className="lg:col-span-5">
            <TelemetryPanel />
          </div>
        </div>
        <PipelineChecklist />
        <AgentDecisions />

        {logsOpen && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 12 }}
            ref={logsRef}
            transition={{ duration: 0.3 }}
          >
            <BuildLogsDrawer onClose={toggleLogs} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

"use client";

import {
  ChevronDown,
  Eye,
  GitFork,
  History,
  Rocket,
  Save,
  Share,
  Terminal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SANDBOX_STATUS, type SandboxState } from "./sandbox-panel";

interface WorkspaceHeaderProps {
  sandboxState: SandboxState;
  onPreview: () => void;
  onSave: () => void;
  onOpenHistory: () => void;
  onDeploy: () => void;
}

const HEADER_LABEL: Record<SandboxState, string> = {
  idle: "Sandbox idle",
  building: "Building sandbox",
  running: "Sandbox active",
  restarting: "Restarting sandbox",
  failed: "Sandbox failed",
  ready: "Sandbox ready",
};

export function WorkspaceHeader({
  sandboxState,
  onPreview,
  onSave,
  onOpenHistory,
  onDeploy,
}: WorkspaceHeaderProps) {
  const status = SANDBOX_STATUS[sandboxState];

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] bg-brand-surface px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-purple">
          <Terminal className="h-4 w-4 text-white" />
        </div>
        <span className="hidden text-sm font-semibold text-zinc-100 sm:inline">
          Kairo<span className="text-brand-purple-light">Pro</span>
        </span>
        <span className="hidden h-4 w-px bg-white/10 sm:block" />
        <span className="truncate text-sm font-medium text-zinc-200">
          TaskFlow
        </span>
        <span
          className={cn(
            "hidden shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono-tech text-[10px] font-medium uppercase tracking-[0.08em] md:flex",
            status.chip,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
          {HEADER_LABEL[sandboxState]}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          title="Switch branch"
          className="hidden h-7 items-center gap-1.5 rounded-[4px] border border-white/[0.08] bg-white/[0.03] px-2.5 font-mono-tech text-[11px] text-zinc-300 transition-colors hover:bg-white/[0.06] sm:flex"
        >
          <GitFork className="h-3.5 w-3.5 text-brand-green" />
          feat/taskflow
          <ChevronDown className="h-3 w-3 text-zinc-500" />
        </button>
        <span className="hidden h-4 w-px bg-white/10 sm:block" />
        <button
          type="button"
          title="Deploy to production"
          onClick={onDeploy}
          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <Rocket className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="History & checkpoints"
          onClick={onOpenHistory}
          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <History className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Open preview"
          onClick={onPreview}
          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Share"
          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <Share className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Save (⌘S)"
          onClick={onSave}
          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <Save className="h-4 w-4" />
        </button>
        <div className="ml-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-brand-purple to-brand-cyan text-[9px] font-bold text-white">
          SB
        </div>
      </div>
    </header>
  );
}

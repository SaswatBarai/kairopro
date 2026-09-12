"use client";

import { CheckCircle2, GitFork } from "lucide-react";

import { cn } from "@/lib/utils";
import { SANDBOX_STATUS, type SandboxState } from "./sandbox-panel";

interface WorkspaceStatusBarProps {
  sandboxState: SandboxState;
  savedFile: string | null;
}

export function WorkspaceStatusBar({
  sandboxState,
  savedFile,
}: WorkspaceStatusBarProps) {
  const status = SANDBOX_STATUS[sandboxState];
  const healthy = sandboxState === "running" || sandboxState === "ready";

  return (
    <footer className="flex h-6 shrink-0 items-center justify-between gap-3 border-t border-white/[0.07] bg-brand-surface px-3 font-mono-tech text-[10px]">
      {savedFile ? (
        <span className="flex items-center gap-1.5 text-brand-green">
          <CheckCircle2 className="h-3 w-3" />
          {savedFile}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-zinc-400">
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
          {healthy
            ? "Sandbox healthy"
            : `Sandbox ${status.label.toLowerCase()}`}
        </span>
      )}
      <span className="hidden items-center gap-1.5 text-zinc-500 md:flex">
        <GitFork className="h-2.5 w-2.5" />
        feat/taskflow
      </span>
      <span className="hidden items-center gap-2.5 text-zinc-500 sm:flex">
        <span>Node 20</span>
        <span className="text-zinc-700">•</span>
        <span>412 MB</span>
      </span>
    </footer>
  );
}

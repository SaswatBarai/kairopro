"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, Eye, FolderOpen, Loader2, X } from "lucide-react";

import { HighlightedCode } from "@/components/code/highlighted-code";
import { basename, dirname, fileTone, languageOf } from "@/lib/file-tree";
import { useProjectFileQuery } from "@/lib/queries/files";
import { cn } from "@/lib/utils";

interface CodeEditorProps {
  projectId: string;
  tabs: string[];
  activeTab: string | null;
  className?: string;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onPreview: () => void;
  onAskKairo: () => void;
}

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={copied ? "Copied" : "Copy file"}
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
      className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
    >
      {copied ? (
        <Check className="h-4 w-4 text-brand-green" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

function FileBody({ projectId, path }: { projectId: string; path: string }) {
  const { data: file, isLoading, error } = useProjectFileQuery(projectId, path);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-[12px] text-zinc-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading {basename(path)}…
      </div>
    );
  }
  if (error) {
    return (
      <p className="p-4 text-[13px] text-zinc-400" role="alert">
        Couldn&apos;t open this file. {error.message}
      </p>
    );
  }
  if (!file) return null;

  if (file.content === null) {
    return (
      <p className="p-4 text-[13px] text-zinc-400">
        {file.reason === "binary"
          ? "This file isn't text, so it can't be shown here."
          : `This file is too large to show here (${formatSize(file.size)}).`}
      </p>
    );
  }

  return (
    <div className="w-fit min-w-full p-3">
      <HighlightedCode text={file.content} />
    </div>
  );
}

export function CodeEditor({
  projectId,
  tabs,
  activeTab,
  className,
  onSelectTab,
  onCloseTab,
  onPreview,
  onAskKairo,
}: CodeEditorProps) {
  const { data: file } = useProjectFileQuery(projectId, activeTab);

  return (
    <section
      className={cn("flex min-w-0 flex-1 flex-col bg-brand-surface", className)}
    >
      <div
        aria-label="Open files"
        className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-white/[0.07]"
        role="tablist"
      >
        {tabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <div
              key={tab}
              className={cn(
                "group relative flex shrink-0 items-center gap-2 border-r border-white/[0.06] px-3",
                active ? "bg-brand-surface-muted text-white" : "text-zinc-500",
              )}
            >
              <button
                aria-selected={active}
                className="flex items-center gap-2 py-2 font-mono-tech text-[12px]"
                role="tab"
                title={tab}
                type="button"
                onClick={() => onSelectTab(tab)}
              >
                <span
                  className={cn("h-[5px] w-[5px] rounded-full", fileTone(tab))}
                />
                {basename(tab)}
              </button>
              <button
                aria-label={`Close ${basename(tab)}`}
                type="button"
                title="Close"
                onClick={() => onCloseTab(tab)}
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-[2px] text-zinc-600 transition-colors hover:bg-white/[0.08] hover:text-zinc-200",
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                <X className="h-3 w-3" />
              </button>
              {active && (
                <motion.span
                  layoutId="ws-tab-underline"
                  className="absolute inset-x-0 -bottom-px h-[2px] bg-brand-purple"
                />
              )}
            </div>
          );
        })}
      </div>

      {activeTab ? (
        <>
          <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] px-3">
            <div className="flex min-w-0 items-center gap-2 font-mono-tech text-[12px]">
              {dirname(activeTab) && (
                <span className="truncate text-zinc-600">
                  {dirname(activeTab)}/
                </span>
              )}
              <span className="truncate text-zinc-300">
                {basename(activeTab)}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {file?.content != null && <CopyButton text={file.content} />}
              <button
                type="button"
                title="Open preview"
                onClick={onPreview}
                className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <FileBody projectId={projectId} path={activeTab} />
          </div>

          <div className="flex h-7 shrink-0 select-none items-center justify-between border-t border-white/[0.07] bg-brand-surface px-3 font-mono-tech text-[10px] text-zinc-500">
            <div className="flex items-center gap-3">
              <span>{languageOf(activeTab)}</span>
              <span className="hidden sm:inline">UTF-8</span>
              {file && <span>{formatSize(file.size)}</span>}
            </div>
            <span>Read-only</span>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-brand-surface-muted/40 px-6 text-center">
          <FolderOpen className="h-8 w-8 text-zinc-600" />
          <div>
            <p className="font-mono-tech text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              No file selected
            </p>
            <p className="mt-2 text-[13px] text-zinc-400">
              Select a file from the explorer
            </p>
            <p className="text-[13px] text-zinc-400">or</p>
          </div>
          <button
            type="button"
            onClick={onAskKairo}
            className="h-8 rounded-[4px] border border-white/[0.1] px-3.5 text-[12px] text-zinc-200 transition-colors hover:border-brand-purple/50 hover:bg-brand-purple/10 hover:text-white"
          >
            Ask Kairo to change something
          </button>
        </div>
      )}
    </section>
  );
}

"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Eye, FileDiff, FolderOpen, Save, Share, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ACTIVE_LINE,
  DIFF,
  FILES,
  MODIFIED_TAB,
  NEW_FILE_LINES,
  basename,
  fileTone,
} from "./code-content";

interface CodeEditorProps {
  tabs: string[];
  activeTab: string | null;
  diffMode: boolean;
  className?: string;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onToggleDiff: (open: boolean) => void;
  onAcceptChanges: () => void;
  onRejectChanges: () => void;
  onPreview: () => void;
  onSave: () => void;
  onAskKairo: () => void;
}

const lineVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

function CodePane({
  lines,
  activeLine,
}: {
  lines: ReactNode[];
  activeLine?: number;
}) {
  return (
    <motion.div
      key="code"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.02 } } }}
      className="w-fit min-w-full py-2 font-mono-tech text-[13px] leading-[22px]"
    >
      {lines.map((line, i) => {
        const isActive = activeLine === i + 1;
        return (
          <motion.div
            key={i}
            variants={lineVariants}
            className={cn(
              "flex whitespace-pre select-text",
              isActive
                ? "border-l-2 border-brand-purple bg-brand-purple/[0.08]"
                : "border-l-2 border-transparent",
            )}
          >
            <span
              className={cn(
                "w-10 shrink-0 select-none pr-3 text-right",
                isActive ? "text-brand-purple-light" : "text-zinc-600",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "pr-6",
                isActive ? "text-zinc-100" : "text-zinc-300",
              )}
            >
              {line}
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function DiffPane({
  title,
  lines,
  marks,
  tone,
}: {
  title: string;
  lines: ReactNode[];
  marks: number[];
  tone: "removed" | "added";
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="sticky top-0 z-[1] flex h-7 items-center border-b border-white/[0.06] bg-brand-surface px-3">
        <span
          className={cn(
            "font-mono-tech text-[10px] font-semibold uppercase tracking-[0.12em]",
            tone === "removed" ? "text-rose-300/80" : "text-brand-green",
          )}
        >
          {title}
        </span>
      </div>
      <div className="w-fit min-w-full py-1.5 font-mono-tech text-[13px] leading-[22px]">
        {lines.map((line, i) => {
          const marked = marks.includes(i);
          return (
            <div
              key={i}
              className={cn(
                "flex whitespace-pre border-l-2 border-transparent pr-6",
                marked &&
                  tone === "removed" &&
                  "border-l-rose-400/60 bg-rose-500/[0.07] text-rose-200",
                marked &&
                  tone === "added" &&
                  "border-l-brand-green/60 bg-brand-green/[0.07] text-brand-green/90",
                !marked && "text-zinc-300",
              )}
            >
              <span className="w-10 shrink-0 select-none pr-2 text-right text-zinc-600">
                {marked ? (tone === "removed" ? "-" : "+") : ""}
              </span>
              <span>{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CodeEditor({
  tabs,
  activeTab,
  diffMode,
  className,
  onSelectTab,
  onCloseTab,
  onToggleDiff,
  onAcceptChanges,
  onRejectChanges,
  onPreview,
  onSave,
  onAskKairo,
}: CodeEditorProps) {
  const isRoute = activeTab === MODIFIED_TAB;
  const showDiff = diffMode && isRoute;
  const lines = (activeTab && FILES[activeTab]) || NEW_FILE_LINES;

  return (
    <section
      className={cn("flex min-w-0 flex-1 flex-col bg-brand-surface", className)}
    >
      <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-white/[0.07]">
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
                type="button"
                onClick={() => onSelectTab(tab)}
                className="flex items-center gap-2 py-2 font-mono-tech text-[12px]"
              >
                <span
                  className={cn("h-[5px] w-[5px] rounded-full", fileTone(tab))}
                />
                {basename(tab)}
              </button>
              <button
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
              <span className="truncate text-zinc-300">
                {basename(activeTab)}
              </span>
              {isRoute && (
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-zinc-500">
                  <span className="h-[5px] w-[5px] rounded-full bg-amber-400" />
                  Modified
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                title="Toggle diff"
                disabled={!isRoute}
                onClick={() => onToggleDiff(!diffMode)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-[4px] transition-colors",
                  showDiff
                    ? "bg-brand-purple/15 text-brand-purple-light"
                    : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200",
                  !isRoute &&
                    "cursor-default opacity-30 hover:bg-transparent hover:text-zinc-500",
                )}
              >
                <FileDiff className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Open preview"
                onClick={onPreview}
                className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Save (⌘S)"
                onClick={onSave}
                className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Share"
                className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <Share className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {showDiff ? (
              <div className="flex min-h-full flex-col">
                <div className="flex flex-1 divide-x divide-white/[0.06] overflow-x-auto">
                  <DiffPane
                    title="Before"
                    lines={DIFF.before.lines}
                    marks={DIFF.before.marks}
                    tone="removed"
                  />
                  <DiffPane
                    title="After"
                    lines={DIFF.after.lines}
                    marks={DIFF.after.marks}
                    tone="added"
                  />
                </div>
                <div className="flex h-11 shrink-0 items-center justify-end gap-2 border-t border-white/[0.07] px-3">
                  <button
                    type="button"
                    onClick={onRejectChanges}
                    className="h-7 rounded-[4px] border border-white/[0.1] px-3 font-mono-tech text-[11px] text-zinc-300 transition-colors hover:bg-white/[0.06]"
                  >
                    Reject changes
                  </button>
                  <button
                    type="button"
                    onClick={onAcceptChanges}
                    className="h-7 rounded-[4px] bg-brand-purple px-3 font-mono-tech text-[11px] font-medium text-white transition-colors hover:bg-brand-purple/85"
                  >
                    Accept changes
                  </button>
                </div>
              </div>
            ) : (
              <CodePane
                lines={lines}
                activeLine={isRoute ? ACTIVE_LINE : undefined}
              />
            )}
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
            Ask Kairo to create one
          </button>
        </div>
      )}
    </section>
  );
}

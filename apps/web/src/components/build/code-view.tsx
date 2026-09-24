"use client";

import { useState } from "react";
import { ArrowDownToLine, Check, Minus } from "lucide-react";

import type { BuildViewState, CodeFile } from "@/lib/build-view";
import { HighlightedCode } from "@/components/code/highlighted-code";
import { cn } from "@/lib/utils";

import { useStickyScroll } from "./use-sticky-scroll";

function FileStatusDot({ file }: { file: CodeFile }) {
  if (file.status === "writing") {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-center">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-cyan" />
      </span>
    );
  }
  if (file.status === "omitted") {
    return <Minus className="h-3.5 w-3.5 text-zinc-500" />;
  }
  return <Check className="h-3.5 w-3.5 text-brand-green" strokeWidth={3} />;
}

function statusLabel(file: CodeFile): string {
  if (file.status === "omitted") return "Not included";
  if (file.status === "done") return "Done";
  return file.attempts > 1 ? `Refining · attempt ${file.attempts}` : "Writing";
}

export function CodeView({ view }: { view: BuildViewState }) {
  // `null` follows whatever file the agent is writing; picking a file pins it.
  const [pinned, setPinned] = useState<string | null>(null);

  const shownPath = pinned ?? view.activeFile ?? view.fileOrder[0] ?? null;
  const file = shownPath ? view.files[shownPath] : undefined;
  const { ref, paused, onScroll, resume } = useStickyScroll<HTMLDivElement>(
    `${shownPath}:${file?.text.length ?? 0}`,
  );

  if (view.fileOrder.length === 0) {
    return (
      <div className="flex min-h-[380px] items-center justify-center p-6 text-center text-xs text-zinc-500">
        Code appears here as the agent writes it.
      </div>
    );
  }

  return (
    <div className="grid min-h-[380px] grid-cols-1 md:grid-cols-[260px_1fr]">
      <div className="flex max-h-[420px] flex-col gap-0.5 overflow-y-auto border-b border-white/[0.08] p-2 md:border-b-0 md:border-r">
        <div className="px-1.5 pb-1 font-mono-tech text-[10px] text-zinc-500">
          {view.fileOrder.length} file{view.fileOrder.length === 1 ? "" : "s"}
        </div>
        {view.fileOrder.map((path) => {
          const item = view.files[path]!;
          return (
            <button
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-[3px] px-1.5 py-1 text-left font-mono-tech text-[11px] transition-colors",
                path === shownPath
                  ? "bg-white/[0.08] text-zinc-100"
                  : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100",
              )}
              key={path}
              title={path}
              type="button"
              onClick={() => setPinned(path)}
            >
              <FileStatusDot file={item} />
              <span className="truncate">{path}</span>
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-1.5 font-mono-tech text-[11px]">
          <span className="truncate text-zinc-300">{shownPath}</span>
          <div className="flex shrink-0 items-center gap-3">
            {file && (
              <span
                className={
                  file.status === "writing"
                    ? "text-brand-cyan"
                    : "text-zinc-500"
                }
              >
                {statusLabel(file)}
              </span>
            )}
            {pinned && (
              <button
                className="cursor-pointer text-brand-purple-light hover:underline"
                type="button"
                onClick={() => setPinned(null)}
              >
                Follow live
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <div
            aria-label="Generated code"
            className="max-h-[420px] min-h-[340px] overflow-auto p-3"
            ref={ref}
            role="region"
            tabIndex={0}
            onScroll={onScroll}
          >
            <HighlightedCode
              cursor={file?.status === "writing"}
              text={file?.text ?? ""}
            />
          </div>
          {paused && file?.status === "writing" && (
            <button
              className="absolute bottom-3 right-4 flex cursor-pointer items-center gap-1.5 rounded-[3px] border border-white/[0.12] bg-brand-surface-muted px-2 py-1 font-mono-tech text-[11px] text-zinc-200 shadow-lg hover:bg-white/[0.1]"
              type="button"
              onClick={resume}
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Resume auto-scroll
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

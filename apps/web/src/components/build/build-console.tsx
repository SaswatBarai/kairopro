"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  Braces,
  CheckCircle2,
  Sparkles,
  Terminal,
} from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import type { BuildViewState } from "@/lib/build-view";
import { cn } from "@/lib/utils";
import type { StreamConnection } from "@/stores/use-build-view-store";

import { CodeView } from "./code-view";
import { useStickyScroll } from "./use-sticky-scroll";

type TabId = "terminal" | "code" | "refinements";

const CONNECTION_LABEL: Record<StreamConnection, string> = {
  idle: "Not connected",
  connecting: "Connecting…",
  live: "Live",
  reconnecting: "Reconnecting…",
  closed: "Closed",
};

function TerminalPane({ view }: { view: BuildViewState }) {
  const { ref, paused, onScroll, resume } = useStickyScroll<HTMLDivElement>(
    view.terminal.length,
  );

  return (
    <div className="relative">
      <div
        aria-label="Terminal output"
        className="max-h-[420px] min-h-[380px] select-text overflow-auto p-3 font-mono-tech text-[13px] leading-[1.65] text-zinc-100"
        ref={ref}
        role="log"
        tabIndex={0}
        onScroll={onScroll}
      >
        {view.terminal.length === 0 ? (
          <span className="text-xs text-zinc-500">
            Output appears here as the build runs.
          </span>
        ) : (
          view.terminal.map((line, index) => (
            <div className="flex items-start gap-3" key={line.seq}>
              <span className="select-none pt-[2px] text-[11px] text-zinc-600">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={
                  line.stream === "stderr" ? "text-zinc-400" : "text-zinc-100"
                }
              >
                {line.text}
              </span>
            </div>
          ))
        )}
      </div>
      {paused && (
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
  );
}

function RefinementsPane({ view }: { view: BuildViewState }) {
  const refined = view.fileOrder
    .map((path) => view.files[path]!)
    .filter((file) => file.attempts > 1);

  if (refined.length === 0) {
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center p-6 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-brand-surface-muted">
          <CheckCircle2 className="h-5 w-5 text-brand-green" />
        </div>
        <div className="text-[15px] font-semibold text-zinc-100">
          Nothing needed refining
        </div>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-400">
          When a file doesn&apos;t pass its checks the agent rewrites it. Those
          files are listed here.
        </p>
      </div>
    );
  }

  return (
    <ul className="min-h-[380px] divide-y divide-white/[0.06] p-2 font-mono-tech text-xs">
      {refined.map((file) => (
        <li
          className="flex items-center justify-between gap-3 px-2 py-2"
          key={file.path}
        >
          <span className="truncate text-zinc-200">{file.path}</span>
          <span className="shrink-0 text-zinc-500">
            written {file.attempts} times
          </span>
        </li>
      ))}
    </ul>
  );
}

interface BuildConsoleProps {
  view: BuildViewState;
  connection: StreamConnection;
}

export function BuildConsole({ view, connection }: BuildConsoleProps) {
  const [tab, setTab] = useState<TabId>("code");
  const refinedCount = view.fileOrder.filter(
    (p) => view.files[p]!.attempts > 1,
  ).length;

  const tabs = [
    {
      id: "terminal" as const,
      label: "Terminal",
      icon: Terminal,
      count: view.terminal.length,
    },
    {
      id: "code" as const,
      label: "Code",
      icon: Braces,
      count: view.fileOrder.length,
    },
    {
      id: "refinements" as const,
      label: "Refinements",
      icon: Sparkles,
      count: refinedCount,
    },
  ];

  return (
    <FadeIn delay={0.08}>
      <div className="flex w-full flex-col overflow-hidden rounded-[3px] border border-white/[0.08] bg-brand-dark">
        <div
          aria-label="Build output"
          className="-mb-px flex h-10 items-center gap-1 overflow-x-auto border-b border-white/[0.08] bg-white/[0.04] px-3"
          role="tablist"
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                aria-selected={active}
                className={cn(
                  "flex h-full cursor-pointer items-center gap-2 border-b-2 px-3 text-xs transition-colors",
                  active
                    ? "border-brand-purple-light font-medium text-zinc-100"
                    : "border-transparent text-zinc-400 hover:text-zinc-100",
                )}
                key={t.id}
                role="tab"
                type="button"
                onClick={() => setTab(t.id)}
              >
                <t.icon
                  className={cn(
                    "h-[15px] w-[15px]",
                    active ? "text-brand-purple-light" : "text-zinc-500",
                  )}
                />
                <span>{t.label}</span>
                <span className="rounded-[3px] border border-white/[0.06] bg-brand-surface-muted px-1.5 py-0.5 font-mono-tech text-[10px] text-zinc-400">
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {tab === "terminal" && <TerminalPane view={view} />}
        {tab === "code" && <CodeView view={view} />}
        {tab === "refinements" && <RefinementsPane view={view} />}

        <div className="flex items-center justify-between border-t border-white/[0.08] bg-brand-surface-muted px-3 py-1.5 font-mono-tech text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                connection === "live"
                  ? "bg-brand-cyan"
                  : connection === "reconnecting" || connection === "connecting"
                    ? "animate-pulse bg-amber-400"
                    : "bg-zinc-500",
              )}
            />
            <span className="text-zinc-400">
              Stream: {CONNECTION_LABEL[connection]}
            </span>
          </span>
          <span>{view.fileOrder.length} files written</span>
        </div>
      </div>
    </FadeIn>
  );
}

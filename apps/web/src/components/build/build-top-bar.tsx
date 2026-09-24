"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

interface BuildTopBarProps {
  projectName: string;
  buildId: string;
  /** ISO time the build started; null while it is still queued. */
  startedAt: string | null;
  /** Cancel was requested and the build is finishing its current file. */
  stopping: boolean;
  onRequestCancel: () => void;
}

export function BuildTopBar({
  projectName,
  buildId,
  startedAt,
  stopping,
  onRequestCancel,
}: BuildTopBarProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = startedAt ? (now - new Date(startedAt).getTime()) / 1000 : 0;

  return (
    <section className="w-full border-b border-white/[0.08] px-6 py-3">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            className="text-zinc-400 transition-colors hover:text-zinc-100"
            href="/dashboard"
          >
            Projects
          </Link>
          <span className="select-none text-[12px] text-zinc-500">/</span>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
            {projectName}
          </span>
          <span className="select-none text-[12px] text-zinc-500">/</span>
          <span className="font-mono-tech text-xs text-zinc-400">
            Build {buildId.slice(-4)}
          </span>
          <div
            className={
              stopping
                ? "ml-1 inline-flex items-center gap-1.5 rounded-[3px] border border-amber-400/30 bg-amber-400/10 px-2 py-0.5"
                : "ml-1 inline-flex items-center gap-1.5 rounded-[3px] border border-brand-cyan/30 bg-brand-cyan/10 px-2 py-0.5"
            }
          >
            <span
              className={
                stopping
                  ? "h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400"
                  : "h-1.5 w-1.5 animate-pulse rounded-full bg-brand-cyan"
              }
            />
            <span
              className={
                stopping
                  ? "font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-amber-300"
                  : "font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-cyan"
              }
            >
              {stopping ? "Stopping" : startedAt ? "Building" : "Queued"}
            </span>
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          {startedAt && (
            <div className="mr-2 hidden items-center gap-1.5 font-mono-tech text-[11px] text-zinc-400 md:flex">
              <span className="text-zinc-500">Elapsed:</span>
              <span className="font-medium text-zinc-100">
                {formatDuration(elapsed)}
              </span>
            </div>
          )}
          <button
            className="flex items-center gap-1.5 rounded-[3px] border border-white/[0.1] bg-brand-surface-muted px-3 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-500/50 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={stopping}
            type="button"
            onClick={onRequestCancel}
          >
            <X className="h-3.5 w-3.5 text-zinc-500" />
            <span>Cancel build</span>
          </button>
        </div>
      </div>
    </section>
  );
}

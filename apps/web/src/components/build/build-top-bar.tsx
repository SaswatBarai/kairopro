"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const INITIAL_SECONDS = 27;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function BuildTopBar({
  onRequestCancel,
}: {
  onRequestCancel: () => void;
}) {
  const [elapsed, setElapsed] = useState(INITIAL_SECONDS);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return (
    <section className="w-full border-b border-white/[0.08] px-6 py-3">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <a
            className="text-zinc-400 transition-colors hover:text-zinc-100"
            href="#"
          >
            Projects
          </a>
          <span className="select-none text-[12px] text-zinc-500">/</span>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
            TaskFlow
          </span>
          <span className="select-none text-[12px] text-zinc-500">/</span>
          <span className="font-mono-tech text-xs text-zinc-400">
            Build #0482
          </span>
          <div className="ml-1 inline-flex items-center gap-1.5 rounded-[3px] border border-brand-cyan/30 bg-brand-cyan/10 px-2 py-0.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-cyan" />
            <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-cyan">
              Building
            </span>
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <div className="mr-2 hidden items-center gap-1.5 font-mono-tech text-[11px] text-zinc-400 md:flex">
            <span className="text-zinc-500">Elapsed:</span>
            <span className="font-medium text-zinc-100">
              {pad(hours)}:{pad(minutes)}:{pad(seconds)}
            </span>
          </div>
          <button
            className="flex items-center gap-1.5 rounded-[3px] border border-white/[0.1] bg-brand-surface-muted px-3 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-500/50 hover:text-zinc-100"
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

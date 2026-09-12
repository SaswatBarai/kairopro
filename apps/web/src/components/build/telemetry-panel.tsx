"use client";

import { useState } from "react";
import {
  ChartNoAxesColumn,
  Check,
  CloudCheck,
  Copy,
  GitFork,
} from "lucide-react";

const PREVIEW_URL = "https://taskflow-preview-0482.kairo.dev";

const METRICS = [
  { label: "Application Surface", value: "8 Pages", sub: "Dynamic SSR + SSG" },
  { label: "API Endpoints", value: "9 Routes", sub: "REST + Server Actions" },
  { label: "Relational Schema", value: "6 Models", sub: "Prisma PostgreSQL" },
  {
    label: "Test Suite",
    value: "14/14",
    sub: "Vitest & E2E suite",
    badge: "100%",
  },
];

const BUNDLE_SEGMENTS = [
  {
    width: "45%",
    color: "bg-brand-purple",
    label: "Next Core",
    title: "Framework: 57.6 KB",
  },
  {
    width: "30%",
    color: "bg-brand-cyan",
    label: "User UI",
    title: "App Pages: 38.4 KB",
  },
  {
    width: "25%",
    color: "bg-brand-green",
    label: "Radix Libs",
    title: "Shared Chunks: 32 KB",
  },
];

export function TelemetryPanel() {
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    void navigator.clipboard?.writeText(PREVIEW_URL);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-lg border border-white/[0.08] bg-brand-surface-muted p-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
            <ChartNoAxesColumn className="h-4 w-4 text-brand-purple-light" />
            Artifact Manifest
          </h3>
          <span className="rounded-[2px] bg-white/[0.05] px-1.5 py-0.5 font-mono-tech text-[11px] text-zinc-400">
            Node v20.14
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {METRICS.map((metric) => (
            <div
              className="flex flex-col gap-1 rounded-lg bg-brand-surface p-2"
              key={metric.label}
            >
              <span className="font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
                {metric.label}
              </span>
              <span className="text-xl font-bold tracking-tight text-zinc-100">
                {metric.value}
              </span>
              <span className="font-mono-tech text-[11px] text-zinc-500">
                {metric.sub}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5 rounded-lg bg-brand-surface p-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">First Load JS Total</span>
            <span className="font-mono-tech text-xs font-semibold text-zinc-100">
              128 KB{" "}
              <span className="text-[11px] text-brand-green">
                (-24% vs baseline)
              </span>
            </span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
            {BUNDLE_SEGMENTS.map((segment) => (
              <div
                className={segment.color}
                key={segment.label}
                style={{ width: segment.width }}
                title={segment.title}
              />
            ))}
          </div>
          <div className="flex items-center justify-between pt-1 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
            {BUNDLE_SEGMENTS.map((segment) => (
              <span className="flex items-center gap-1" key={segment.label}>
                <span className={segment.color + " h-2 w-2 rounded-[2px]"} />
                {segment.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-brand-surface-muted p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono-tech text-[11px] uppercase tracking-wider text-zinc-500">
            Deployment Topology
          </span>
          <span className="rounded-[2px] bg-brand-green/10 px-1.5 py-0.5 font-mono-tech text-[11px] font-semibold text-brand-green">
            Production Edge
          </span>
        </div>
        <div className="flex flex-col gap-1 font-mono-tech text-[11px]">
          <div className="flex items-center justify-between rounded-[3px] bg-brand-surface px-2 py-1">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <GitFork className="h-4 w-4" />
              <span>Repository</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-100">
              <span>org/taskflow</span>
              <span className="rounded-[2px] bg-white/[0.08] px-1 py-0.5 text-[10px] font-bold text-brand-purple-light">
                a7f92e1
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-[3px] bg-brand-surface px-2 py-1">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <CloudCheck className="h-4 w-4" />
              <span>Preview Host</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-brand-green">Ready</span>
              <button
                className="cursor-pointer font-mono-tech text-[11px] text-brand-purple-light transition-colors hover:text-violet-300"
                type="button"
                onClick={copyUrl}
              >
                {copied ? "Copied" : "Copy URL"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

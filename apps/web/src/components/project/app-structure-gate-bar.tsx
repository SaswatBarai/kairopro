"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  History,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BuildState = "idle" | "provisioning" | "started";

export function AppStructureGateBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const [buildState, setBuildState] = useState<BuildState>("idle");

  const onStartBuild = () => {
    if (buildState !== "idle") return;
    setBuildState("provisioning");
    window.setTimeout(() => {
      setBuildState("started");
      const nextUrl = projectId
        ? `/projects/new/build?projectId=${projectId}`
        : "/projects/new/build";
      window.setTimeout(() => router.push(nextUrl), 900);
    }, 1200);
  };

  return (
    <div className="w-full bg-brand-surface px-6 py-3">
      <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono-tech text-xs text-zinc-400">
            <span>Projects</span>
            <span className="text-zinc-600">/</span>
            <span>New project</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Gate 3: App Structure</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold tracking-tight text-zinc-100">
              TaskFlow — Architectural Review
            </h1>
            <span className="rounded-[3px] border border-white/[0.08] bg-brand-surface-muted px-2 py-0.5 font-mono-tech text-[11px] font-medium text-zinc-400">
              ID: PRD-001
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start rounded-lg border border-white/[0.08] bg-brand-dark p-1 text-xs font-medium md:self-center">
          <div className="flex items-center gap-1.5 rounded-[3px] border border-white/[0.08] bg-white/[0.06] px-2.5 py-1 text-zinc-300">
            <Check
              className="h-[13px] w-[13px] text-brand-green"
              strokeWidth={3}
            />
            <span className="font-mono-tech text-[11px]">1 PRD</span>
          </div>
          <span className="text-xs text-zinc-600">/</span>
          <div className="flex items-center gap-1.5 rounded-[3px] border border-white/[0.08] bg-white/[0.06] px-2.5 py-1 text-zinc-300">
            <Check
              className="h-[13px] w-[13px] text-brand-green"
              strokeWidth={3}
            />
            <span className="font-mono-tech text-[11px]">2 Data Model</span>
          </div>
          <span className="text-xs text-zinc-600">/</span>
          <div className="flex items-center gap-1.5 rounded-[3px] bg-brand-purple px-2.5 py-1 font-mono-tech text-[11px] font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            <span>3 App Structure</span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.05] px-3 font-mono-tech text-xs text-zinc-300 transition-colors hover:bg-white/[0.08]"
            type="button"
          >
            <History className="h-3.5 w-3.5" />
            <span>Revisions (3)</span>
          </button>
          <Button
            className={cn(
              "h-9 gap-2 rounded-md px-4 text-xs font-semibold",
              buildState === "provisioning" && "pointer-events-none opacity-80",
            )}
            type="button"
            onClick={onStartBuild}
          >
            {buildState === "idle" && (
              <>
                <span>Start build</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
            {buildState === "provisioning" && (
              <>
                <span className="font-mono-tech text-[11px] uppercase tracking-wider">
                  Provisioning...
                </span>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              </>
            )}
            {buildState === "started" && (
              <>
                <span>Build started</span>
                <CheckCheck className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

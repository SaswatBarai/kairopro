"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCheck, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ApproveState = "idle" | "saving" | "approved";

export function SpecGateBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const [approveState, setApproveState] = useState<ApproveState>("idle");

  const onApprove = () => {
    if (approveState !== "idle") return;
    setApproveState("saving");
    window.setTimeout(() => {
      setApproveState("approved");
      const nextUrl = projectId
        ? `/projects/new/data-model?projectId=${projectId}`
        : "/projects/new/data-model";
      window.setTimeout(() => router.push(nextUrl), 900);
    }, 1200);
  };

  return (
    <div className="sticky top-[69px] z-40 w-full border-b border-white/[0.08] bg-brand-surface px-4 py-3 sm:top-[81px] md:px-6">
      <div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2 font-mono-tech text-[11px] text-zinc-400">
          <span className="cursor-pointer transition-colors hover:text-zinc-100">
            Projects
          </span>
          <span className="text-zinc-600">/</span>
          <span className="cursor-pointer transition-colors hover:text-zinc-100">
            New project
          </span>
          <span className="text-zinc-600">/</span>
          <span className="rounded-[3px] bg-brand-purple-light/10 px-1.5 py-0.5 font-mono-tech text-[11px] text-brand-purple-light">
            Gate 1: PRD
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-purple font-mono-tech text-[10px] font-semibold text-white">
              1
            </div>
            <span className="text-sm font-medium text-zinc-100">PRD</span>
            <div className="ml-1.5 h-[2px] w-8 bg-brand-purple" />
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] font-mono-tech text-[10px] text-zinc-400">
              2
            </div>
            <span className="text-xs text-zinc-500">Data Model</span>
            <div className="ml-1.5 h-px w-8 bg-white/[0.15]" />
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] font-mono-tech text-[10px] text-zinc-400">
              3
            </div>
            <span className="text-xs text-zinc-500">App Structure</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className={cn(
              "h-9 gap-1.5 rounded-[3px] px-3",
              approveState === "saving" && "pointer-events-none opacity-80",
            )}
            id="approveBtn"
            type="button"
            onClick={onApprove}
          >
            {approveState === "idle" && (
              <>
                <span>Approve and continue</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
            {approveState === "saving" && (
              <>
                <span className="font-mono-tech text-[11px] uppercase tracking-wider">
                  Saving spec...
                </span>
                <RefreshCw className="h-4 w-4 animate-spin" />
              </>
            )}
            {approveState === "approved" && (
              <>
                <span>Gate 1 Approved</span>
                <CheckCheck className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

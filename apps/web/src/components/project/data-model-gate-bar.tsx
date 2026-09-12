"use client";

import { useRouter } from "next/navigation";
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

type ApproveState = "idle" | "saving" | "approved";

export function DataModelGateBar() {
  const router = useRouter();
  const [approveState, setApproveState] = useState<ApproveState>("idle");

  const onApprove = () => {
    if (approveState !== "idle") return;
    setApproveState("saving");
    window.setTimeout(() => {
      setApproveState("approved");
      window.setTimeout(() => router.push("/projects/new/app-structure"), 900);
    }, 1200);
  };

  return (
    <div className="w-full bg-brand-surface px-6 py-3">
      <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 font-mono-tech text-[11px] text-zinc-400">
            <span className="cursor-pointer transition-colors hover:text-zinc-100">
              Projects
            </span>
            <span className="text-zinc-500">/</span>
            <span className="cursor-pointer transition-colors hover:text-zinc-100">
              New project
            </span>
            <span className="text-zinc-500">/</span>
            <span className="font-medium text-brand-purple-light">
              Gate 2: Data Model
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
              TaskFlow — Architectural Review
            </span>
            <span className="rounded-[3px] bg-brand-surface-muted px-2 py-0.5 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-400">
              ID: PRD-001
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-brand-dark px-3 py-1.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
              <Check
                className="h-[13px] w-[13px] leading-none"
                strokeWidth={3}
              />
            </span>
            <span className="font-mono-tech text-[11px] text-zinc-100">
              1 PRD
            </span>
          </div>
          <span className="font-mono-tech text-[10px] text-zinc-600">/</span>
          <div className="flex items-center gap-1.5 rounded-[3px] bg-brand-purple px-2 py-0.5 font-mono-tech text-[11px] font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            <span>2 Data Model</span>
          </div>
          <span className="font-mono-tech text-[10px] text-zinc-600">/</span>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/[0.06] font-mono-tech text-[10px] text-zinc-500">
              3
            </span>
            <span className="font-mono-tech text-[11px]">App Structure</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex cursor-pointer items-center gap-1.5 rounded-[3px] bg-white/[0.06] px-3 py-1.5 text-sm text-zinc-100 transition-colors hover:bg-white/[0.1]"
            type="button"
          >
            <History className="h-4 w-4" />
            <span className="font-mono-tech text-[11px]">Revisions (3)</span>
          </button>
          <Button
            className={cn(
              "h-9 gap-2 rounded-[3px] px-4 font-medium",
              approveState === "saving" && "pointer-events-none opacity-80",
            )}
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
                  Saving schema...
                </span>
                <RefreshCw className="h-4 w-4 animate-spin" />
              </>
            )}
            {approveState === "approved" && (
              <>
                <span>Gate 2 Approved</span>
                <CheckCheck className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
import type { Spec } from "@kairopro/contracts";

import { Button } from "@/components/ui/button";
import { useApproveSpecMutation } from "@/lib/queries/specs";
import { cn } from "@/lib/utils";

interface DataModelGateBarProps {
  spec: Spec | undefined;
  prdApproved: boolean;
}

export function DataModelGateBar({ spec, prdApproved }: DataModelGateBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? "";
  const approveMutation = useApproveSpecMutation(projectId);

  const isApproved = spec?.status === "APPROVED";
  const canApprove = Boolean(spec) && !isApproved && !approveMutation.isPending;

  const onApprove = () => {
    if (!spec || !canApprove) return;
    approveMutation.mutate(spec.id, {
      onSuccess: () => {
        const nextUrl = projectId
          ? `/projects/new/app-structure?projectId=${projectId}`
          : "/projects/new/app-structure";
        router.push(nextUrl);
      },
    });
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
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-brand-dark px-3 py-1.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full",
                prdApproved
                  ? "bg-brand-green/15 text-brand-green"
                  : "bg-white/[0.06] text-zinc-500",
              )}
            >
              <Check
                className="h-[13px] w-[13px] leading-none"
                strokeWidth={3}
              />
            </span>
            <span className="font-mono-tech text-[11px] text-zinc-100">
              PRD
            </span>
          </div>
          <span className="font-mono-tech text-[10px] text-zinc-600">/</span>
          <div className="flex items-center gap-1.5 rounded-[3px] bg-brand-purple px-2 py-0.5 font-mono-tech text-[11px] font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            <span>Data Model</span>
          </div>
          <span className="font-mono-tech text-[10px] text-zinc-600">/</span>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <span className="font-mono-tech text-[11px]">App Structure</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {approveMutation.isError && (
            <span className="flex items-center gap-1 text-xs text-rose-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {approveMutation.error instanceof Error
                ? approveMutation.error.message
                : "Failed to approve"}
            </span>
          )}
          <Button
            className={cn(
              "h-9 gap-2 rounded-[3px] px-4 font-medium",
              approveMutation.isPending && "pointer-events-none opacity-80",
            )}
            disabled={!canApprove && !isApproved}
            type="button"
            onClick={onApprove}
          >
            {isApproved ? (
              <>
                <span>Gate 2 Approved</span>
                <CheckCheck className="h-4 w-4" />
              </>
            ) : approveMutation.isPending ? (
              <>
                <span className="font-mono-tech text-[11px] uppercase tracking-wider">
                  Saving schema...
                </span>
                <RefreshCw className="h-4 w-4 animate-spin" />
              </>
            ) : (
              <>
                <span>Approve and continue</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

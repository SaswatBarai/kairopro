"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
import type { Spec } from "@kairopro/contracts";

import { Button } from "@/components/ui/button";
import { useApproveSpecMutation } from "@/lib/queries/specs";
import { cn } from "@/lib/utils";

interface SpecGateBarProps {
  spec: Spec | undefined;
}

export function SpecGateBar({ spec }: SpecGateBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? "";
  const approveMutation = useApproveSpecMutation(projectId);

  const isApproved = spec?.status === "APPROVED";
  const canApprove = Boolean(spec) && !isApproved && !approveMutation.isPending;

  const goNext = () => {
    router.push(
      projectId
        ? `/projects/new/data-model?projectId=${projectId}`
        : "/projects/new/data-model",
    );
  };

  const onApprove = () => {
    if (!spec || approveMutation.isPending) return;
    // Already approved (e.g. after going Back to review): nothing to
    // approve again, just move on.
    if (isApproved) return goNext();
    approveMutation.mutate(spec.id, { onSuccess: goNext });
  };

  return (
    <div className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-brand-surface px-4 py-3 md:px-6">
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
          {approveMutation.isError && (
            <span className="flex items-center gap-1 text-xs text-rose-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {approveMutation.error instanceof Error
                ? approveMutation.error.message
                : "Failed to approve"}
            </span>
          )}
          {isApproved && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCheck className="h-3.5 w-3.5" />
              Approved
            </span>
          )}
          <Button
            asChild
            className="h-9 gap-1.5 rounded-[3px] px-3"
            variant="outline"
          >
            <Link href={`/projects/new/questions?projectId=${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
          </Button>
          <Button
            className={cn(
              "h-9 gap-1.5 rounded-[3px] px-3",
              approveMutation.isPending && "pointer-events-none opacity-80",
            )}
            disabled={!canApprove && !isApproved}
            id="approveBtn"
            type="button"
            onClick={onApprove}
          >
            {isApproved ? (
              <>
                <span>Continue to data model</span>
                <ArrowRight className="h-4 w-4" />
              </>
            ) : approveMutation.isPending ? (
              <>
                <span className="font-mono-tech text-[11px] uppercase tracking-wider">
                  Saving spec...
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

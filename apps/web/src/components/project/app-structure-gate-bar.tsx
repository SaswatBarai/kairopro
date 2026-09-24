"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
import type { Spec } from "@kairopro/contracts";

import { Button } from "@/components/ui/button";
import { useStartBuildMutation } from "@/lib/queries/builds";
import { useApproveSpecMutation } from "@/lib/queries/specs";
import { cn } from "@/lib/utils";

interface AppStructureGateBarProps {
  spec: Spec | undefined;
  prdApproved: boolean;
  dataModelApproved: boolean;
}

export function AppStructureGateBar({
  spec,
  prdApproved,
  dataModelApproved,
}: AppStructureGateBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? "";
  const approveMutation = useApproveSpecMutation(projectId);
  const startBuildMutation = useStartBuildMutation(projectId);

  const isBusy = approveMutation.isPending || startBuildMutation.isPending;
  const canStart = Boolean(spec) && !isBusy;
  const error = approveMutation.error ?? startBuildMutation.error;

  const onStartBuild = async () => {
    if (!spec || !canStart) return;
    try {
      if (spec.status !== "APPROVED") {
        await approveMutation.mutateAsync(spec.id);
      }
      const build = await startBuildMutation.mutateAsync();
      const nextUrl = `/projects/new/build?projectId=${projectId}&buildId=${build.id}`;
      router.push(nextUrl);
    } catch {
      // Surfaced below via approveMutation.error / startBuildMutation.error.
    }
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
        </div>

        <div className="flex items-center gap-1.5 self-start rounded-lg border border-white/[0.08] bg-brand-dark p-1 text-xs font-medium md:self-center">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-[3px] border border-white/[0.08] px-2.5 py-1",
              prdApproved
                ? "bg-white/[0.06] text-zinc-300"
                : "bg-transparent text-zinc-500",
            )}
          >
            <Check
              className={cn(
                "h-[13px] w-[13px]",
                prdApproved ? "text-brand-green" : "text-zinc-600",
              )}
              strokeWidth={3}
            />
            <span className="font-mono-tech text-[11px]">PRD</span>
          </div>
          <span className="text-xs text-zinc-600">/</span>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-[3px] border border-white/[0.08] px-2.5 py-1",
              dataModelApproved
                ? "bg-white/[0.06] text-zinc-300"
                : "bg-transparent text-zinc-500",
            )}
          >
            <Check
              className={cn(
                "h-[13px] w-[13px]",
                dataModelApproved ? "text-brand-green" : "text-zinc-600",
              )}
              strokeWidth={3}
            />
            <span className="font-mono-tech text-[11px]">Data Model</span>
          </div>
          <span className="text-xs text-zinc-600">/</span>
          <div className="flex items-center gap-1.5 rounded-[3px] bg-brand-purple px-2.5 py-1 font-mono-tech text-[11px] font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            <span>App Structure</span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          {error && (
            <span className="flex items-center gap-1 text-xs text-rose-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {error instanceof Error ? error.message : "Failed to start build"}
            </span>
          )}
          <Button
            asChild
            className="h-9 gap-2 rounded-md px-4 text-xs font-semibold"
            variant="outline"
          >
            <Link href={`/projects/new/data-model?projectId=${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
          </Button>
          <Button
            className={cn(
              "h-9 gap-2 rounded-md px-4 text-xs font-semibold",
              isBusy && "pointer-events-none opacity-80",
            )}
            disabled={!canStart}
            type="button"
            onClick={() => void onStartBuild()}
          >
            {startBuildMutation.isSuccess ? (
              <>
                <span>Build started</span>
                <CheckCheck className="h-3.5 w-3.5" />
              </>
            ) : isBusy ? (
              <>
                <span className="font-mono-tech text-[11px] uppercase tracking-wider">
                  {approveMutation.isPending
                    ? "Approving..."
                    : "Provisioning..."}
                </span>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              </>
            ) : (
              <>
                <span>Start build</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

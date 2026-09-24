"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Loader2 } from "lucide-react";

import { initialBuildView } from "@/lib/build-view";
import {
  useBuildQuery,
  useBuildsQuery,
  useCancelBuildMutation,
  useStartBuildMutation,
} from "@/lib/queries/builds";
import { useProjectQuery } from "@/lib/queries/projects";
import { cn } from "@/lib/utils";
import { useBuildViewStore } from "@/stores/use-build-view-store";

import { BuildConsole } from "./build-console";
import { BuildResult } from "./build-result";
import { BuildTopBar } from "./build-top-bar";
import { CancelBuildModal } from "./cancel-build-modal";
import { ExecutionPipeline } from "./execution-pipeline";
import { useBuildStream } from "./use-build-stream";

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[320px] w-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-zinc-400">
      {children}
    </div>
  );
}

export function BuildScreen({ projectId }: { projectId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [cancelOpen, setCancelOpen] = useState(false);

  const projectQuery = useProjectQuery(projectId);
  const buildsQuery = useBuildsQuery(projectId);
  // No `buildId` in the URL (e.g. arriving from the dashboard): the latest.
  const buildId = search.get("buildId") ?? buildsQuery.data?.[0]?.id;
  const buildQuery = useBuildQuery(projectId, buildId ?? "");
  useBuildStream(projectId, buildId);

  const storeBuildId = useBuildViewStore((s) => s.buildId);
  const storeView = useBuildViewStore((s) => s.view);
  const connection = useBuildViewStore((s) => s.connection);
  // Until the stream hook has switched the store to this build, don't show
  // the previous build's events.
  const view = storeBuildId === buildId ? storeView : initialBuildView();

  const cancelMutation = useCancelBuildMutation(projectId);
  const startMutation = useStartBuildMutation(projectId);

  const build = buildQuery.data;
  const status = view.outcome?.status ?? build?.status;
  const isTerminal =
    status === "SUCCEEDED" || status === "FAILED" || status === "CANCELLED";
  const stopping =
    !isTerminal && (cancelMutation.isPending || cancelMutation.isSuccess);
  const projectName = projectQuery.data?.name ?? "Project";

  if (!buildId) {
    if (buildsQuery.isLoading) {
      return (
        <Centered>
          <Loader2 className="h-5 w-5 animate-spin text-brand-purple-light" />
          Loading build…
        </Centered>
      );
    }
    return (
      <Centered>
        <p>There is no build for this project yet.</p>
        <Link
          className="text-brand-purple-light hover:underline"
          href={`/projects/new/app-structure?projectId=${encodeURIComponent(projectId)}`}
        >
          Go to app structure to start one
        </Link>
      </Centered>
    );
  }

  if (!build && !view.outcome) {
    return (
      <Centered>
        <Loader2 className="h-5 w-5 animate-spin text-brand-purple-light" />
        Loading build…
      </Centered>
    );
  }

  if (isTerminal) {
    return (
      <BuildResult
        build={build}
        projectId={projectId}
        projectName={projectName}
        retryError={startMutation.error?.message ?? null}
        retrying={startMutation.isPending}
        status={status}
        view={view}
        onRetry={() =>
          startMutation.mutate(undefined, {
            onSuccess: (next) =>
              router.push(
                `/projects/${encodeURIComponent(projectId)}/build?buildId=${encodeURIComponent(next.id)}`,
              ),
          })
        }
      />
    );
  }

  return (
    <div className="relative w-full">
      <div
        className={cn(
          "flex w-full flex-col transition-all duration-300",
          cancelOpen && "pointer-events-none opacity-40 blur-[3px]",
        )}
      >
        <BuildTopBar
          buildId={buildId}
          projectName={projectName}
          startedAt={build?.startedAt ?? null}
          stopping={stopping}
          onRequestCancel={() => setCancelOpen(true)}
        />
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-6 py-4">
          <ExecutionPipeline stopped={stopping} view={view} />
          <BuildConsole connection={connection} view={view} />
        </div>
      </div>

      <AnimatePresence>
        {cancelOpen && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-brand-dark/80 p-4 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CancelBuildModal
              error={cancelMutation.error?.message ?? null}
              stopping={stopping}
              onConfirm={() => cancelMutation.mutate(buildId)}
              onKeep={() => setCancelOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

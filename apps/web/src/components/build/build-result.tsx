"use client";

import Link from "next/link";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import type { Build } from "@kairopro/contracts";

import { FadeIn } from "@/components/landing/fade-in";
import { simplifications, type BuildViewState } from "@/lib/build-view";

export function describeDuration(
  startedAt: string | null,
  finishedAt: string | null,
) {
  if (!startedAt || !finishedAt) return null;
  const seconds = Math.max(
    0,
    Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000),
  );
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} second${s === 1 ? "" : "s"}`;
  return `${m} minute${m === 1 ? "" : "s"}${s ? ` ${s} second${s === 1 ? "" : "s"}` : ""}`;
}

interface BuildResultProps {
  projectId: string;
  projectName: string;
  status: "SUCCEEDED" | "FAILED" | "CANCELLED";
  build: Build | undefined;
  view: BuildViewState;
  /** `resume` keeps the files the last build finished. */
  onRetry: (resume: boolean) => void;
  retrying: boolean;
  retryError: string | null;
}

const pill = {
  SUCCEEDED: {
    label: "Ready",
    cls: "border-brand-green/30 bg-brand-green/10 text-brand-green",
  },
  CANCELLED: {
    label: "Stopped",
    cls: "border-white/[0.1] bg-white/[0.06] text-zinc-300",
  },
  FAILED: {
    label: "Needs attention",
    cls: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
} as const;

export function BuildResult({
  projectId,
  projectName,
  status,
  build,
  view,
  onRetry,
  retrying,
  retryError,
}: BuildResultProps) {
  const written = view.fileOrder.filter(
    (p) => view.files[p]!.status === "done",
  );
  const notes = simplifications(view);
  const duration = describeDuration(
    build?.startedAt ?? null,
    build?.finishedAt ?? null,
  );

  return (
    <div className="w-full">
      <section className="w-full border-b border-white/[0.08] px-6 py-3">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-2 text-sm">
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
          <span
            className={`ml-1 inline-flex items-center rounded-[3px] border px-2 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider ${pill[status].cls}`}
          >
            {pill[status].label}
          </span>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-6 py-10">
        {status === "SUCCEEDED" && notes.length > 0 && (
          <FadeIn>
            <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <h2 className="text-[15px] font-semibold text-zinc-100">
                    {notes.length === 1
                      ? "One feature was simplified"
                      : `${notes.length} features were simplified`}
                  </h2>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    Your app is ready to use. Some parts were built in a simpler
                    form so the build could finish. You can ask the agent to add
                    them back from the workspace.
                  </p>
                  <details className="group mt-1">
                    <summary className="cursor-pointer text-xs text-amber-300 hover:underline">
                      See what changed
                    </summary>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {notes.map((note) => (
                        <li
                          className="flex items-center justify-between gap-3 rounded-[3px] bg-white/[0.04] px-2.5 py-1.5 text-sm text-zinc-200"
                          key={note.label}
                        >
                          <span>{note.label}</span>
                          <span className="rounded-[3px] border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[11px] text-amber-300">
                            {note.kind === "omitted"
                              ? "Not included"
                              : "Simplified"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              </div>
            </div>
          </FadeIn>
        )}

        <FadeIn delay={0.05}>
          <div className="flex flex-col items-center gap-4 rounded-lg border border-white/[0.08] bg-brand-surface px-6 py-10 text-center">
            {status === "SUCCEEDED" && (
              <>
                <CheckCircle2 className="h-12 w-12 text-brand-green" />
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
                    Your app is ready.
                  </h1>
                  <p className="text-sm text-zinc-400">
                    {duration ? `Built in ${duration}. ` : ""}
                    {written.length} file{written.length === 1 ? "" : "s"}{" "}
                    written.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link
                    className="inline-flex items-center gap-2 rounded-[3px] bg-brand-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-purple/85"
                    href={`/projects/${encodeURIComponent(projectId)}`}
                  >
                    Open workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  {build?.previewUrl && (
                    <a
                      className="inline-flex items-center gap-2 rounded-[3px] border border-white/[0.12] bg-brand-surface-muted px-4 py-2 text-sm text-zinc-100 transition-colors hover:bg-white/[0.08]"
                      href={build.previewUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Open preview
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {build?.finishedAt && (
                  <p className="font-mono-tech text-[11px] text-zinc-500">
                    Finished {new Date(build.finishedAt).toLocaleString()}
                  </p>
                )}
              </>
            )}

            {status === "CANCELLED" && (
              <>
                <Ban className="h-12 w-12 text-zinc-400" />
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
                    Build stopped.
                  </h1>
                  <p className="text-sm text-zinc-400">
                    Everything generated up to that point was kept. Start the
                    build again to finish it.
                  </p>
                </div>
              </>
            )}

            {status === "FAILED" && (
              <>
                <TriangleAlert className="h-12 w-12 text-amber-300" />
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
                    Something went wrong.
                  </h1>
                  <p className="text-sm text-zinc-400">
                    Our team has been notified. You can try again.
                  </p>
                </div>
              </>
            )}

            {status !== "SUCCEEDED" && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  className="inline-flex cursor-pointer items-center gap-2 rounded-[3px] bg-brand-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-purple/85 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={retrying}
                  type="button"
                  onClick={() => onRetry(written.length > 0)}
                >
                  {retrying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  {written.length > 0
                    ? `Continue from file ${written.length + 1}`
                    : status === "CANCELLED"
                      ? "Start build again"
                      : "Try again"}
                </button>
                {written.length > 0 && (
                  <button
                    className="inline-flex cursor-pointer items-center gap-2 rounded-[3px] border border-white/[0.12] bg-brand-surface-muted px-4 py-2 text-sm text-zinc-100 transition-colors hover:bg-white/[0.08] disabled:opacity-60"
                    disabled={retrying}
                    type="button"
                    onClick={() => onRetry(false)}
                  >
                    Start over
                  </button>
                )}
                <Link
                  className="inline-flex items-center gap-2 rounded-[3px] border border-white/[0.12] bg-brand-surface-muted px-4 py-2 text-sm text-zinc-100 transition-colors hover:bg-white/[0.08]"
                  href={`/projects/new/app-structure?projectId=${encodeURIComponent(projectId)}`}
                >
                  Back to app structure
                </Link>
              </div>
            )}
            {retryError && (
              <p className="text-xs text-zinc-400" role="alert">
                {retryError}
              </p>
            )}
          </div>
        </FadeIn>

        {written.length > 0 && (
          <FadeIn delay={0.1}>
            <details className="rounded-lg border border-white/[0.08] bg-brand-surface px-4 py-3">
              <summary className="cursor-pointer text-sm text-zinc-300">
                {written.length} file{written.length === 1 ? "" : "s"} written
              </summary>
              <ul className="mt-3 flex flex-col gap-1 font-mono-tech text-xs text-zinc-400">
                {written.map((path) => (
                  <li key={path}>{path}</li>
                ))}
              </ul>
            </details>
          </FadeIn>
        )}
      </div>
    </div>
  );
}

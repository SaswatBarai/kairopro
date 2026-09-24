"use client";

import { CheckCircle2, History, Loader2 } from "lucide-react";
import type { ChangeRequest } from "@kairopro/contracts";

import { cn } from "@/lib/utils";

interface ChangePlanCardProps {
  change: ChangeRequest;
  /** An approve or discard for this request is in flight. */
  busy: boolean;
  onApprove: () => void;
  onDiscard: () => void;
  onOpenHistory: () => void;
}

const BADGE: Record<string, { label: string; cls: string }> = {
  AWAITING_APPROVAL: {
    label: "Awaiting approval",
    cls: "bg-brand-cyan/10 text-brand-cyan",
  },
  APPLYING: { label: "Applying", cls: "bg-brand-cyan/10 text-brand-cyan" },
  SUCCEEDED: { label: "Applied", cls: "bg-brand-green/10 text-brand-green" },
  FAILED: { label: "Not applied", cls: "bg-amber-400/10 text-amber-300" },
  CANCELLED: { label: "Discarded", cls: "bg-white/[0.06] text-zinc-400" },
};

/**
 * The plan the agent proposes for a change, and where it stands. The plan is
 * applied or discarded as a whole — the backend applies exactly the plan that
 * was shown — so there is nothing to tick per item.
 */
export function ChangePlanCard({
  change,
  busy,
  onApprove,
  onDiscard,
  onOpenHistory,
}: ChangePlanCardProps) {
  const { plan, status } = change;
  const badge = BADGE[status];
  if (!plan || !badge) return null;

  return (
    <div className="space-y-3 rounded-[4px] border border-white/[0.08] bg-brand-surface-muted p-3 shadow-lg shadow-black/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-zinc-100">
              Proposed changes
            </span>
            <span className="rounded-[2px] bg-brand-purple px-1.5 py-px font-mono-tech text-[10px] font-bold text-white">
              {plan.tasks.length}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-zinc-400">
            {plan.summary}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-[2px] px-2 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider",
            badge.cls,
          )}
        >
          {badge.label}
        </span>
      </div>

      <ol className="space-y-1.5">
        {plan.tasks.map((task, i) => (
          <li
            className="flex items-start gap-2.5 px-1.5"
            key={`${task.path}-${i}`}
          >
            <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-purple-light" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] leading-snug text-zinc-100">
                {task.task}
              </span>
              <span className="mt-0.5 block truncate font-mono-tech text-[11px] text-zinc-500">
                {task.path}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <p className="rounded-[3px] bg-brand-dark px-2.5 py-2 text-[12px] leading-relaxed text-zinc-400">
        {plan.diffSummary}
      </p>

      {status === "AWAITING_APPROVAL" && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              className="flex h-9 items-center justify-center gap-2 rounded-[3px] bg-brand-purple px-3 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-purple/85 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              type="button"
              onClick={onApprove}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Apply changes
            </button>
            <button
              className="h-9 rounded-[3px] bg-white/[0.05] px-3 text-[13px] font-semibold text-zinc-100 transition-colors hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              type="button"
              onClick={onDiscard}
            >
              Discard
            </button>
          </div>
          <p className="text-center text-[12px] text-zinc-400">
            You can undo this from History after it&apos;s applied.
          </p>
        </div>
      )}

      {status === "APPLYING" && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="flex items-center gap-2 text-[12px] text-zinc-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-cyan" />
            Applying — each file is checked before anything is saved.
          </span>
          <button
            className="shrink-0 rounded-[3px] bg-white/[0.05] px-2.5 py-1 text-[12px] font-medium text-zinc-100 transition-colors hover:bg-white/[0.09] disabled:opacity-60"
            disabled={busy}
            type="button"
            onClick={onDiscard}
          >
            Cancel
          </button>
        </div>
      )}

      {status === "SUCCEEDED" && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[12px] text-zinc-400">
            Applied
            {change.commitHash && (
              <>
                {" "}
                as{" "}
                <code className="font-mono-tech text-zinc-300">
                  {change.commitHash.slice(0, 7)}
                </code>
              </>
            )}
            .
          </span>
          <button
            className="flex shrink-0 items-center gap-1.5 rounded-[3px] bg-white/[0.05] px-2.5 py-1 text-[12px] font-medium text-zinc-100 transition-colors hover:bg-white/[0.09]"
            type="button"
            onClick={onOpenHistory}
          >
            <History className="h-3.5 w-3.5" />
            View history
          </button>
        </div>
      )}
    </div>
  );
}

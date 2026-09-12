"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface PlanItem {
  id: string;
  label: ReactNode;
  path: string;
  pathTone?: "cyan" | "zinc";
}

const PLAN_ITEMS: PlanItem[] = [
  {
    id: "schema",
    label: (
      <>
        Add{" "}
        <code className="rounded-[2px] bg-brand-dark px-1 py-px font-mono-tech text-[11px] text-brand-cyan">
          dueDate DateTime?
        </code>{" "}
        to the Task model
      </>
    ),
    path: "prisma/schema.prisma",
  },
  {
    id: "migration",
    label: "Create a migration",
    path: "prisma/migrations",
  },
  {
    id: "route",
    label: "Accept dueDate on create and update",
    path: "app/api/tasks/route.ts",
    pathTone: "cyan",
  },
  {
    id: "form",
    label: "Add a date picker to the task form",
    path: "components/TaskForm.tsx",
  },
  {
    id: "card",
    label: "Display the due date on task cards",
    path: "components/TaskCard.tsx",
  },
];

interface AgentPlanGateProps {
  applied: boolean;
  onApply: () => void;
  onOpenDiff: () => void;
  onEditPlan: () => void;
}

export function AgentPlanGate({
  applied,
  onApply,
  onOpenDiff,
  onEditPlan,
}: AgentPlanGateProps) {
  const [checked, setChecked] = useState<string[]>(
    PLAN_ITEMS.map((item) => item.id),
  );

  const toggle = (id: string) => {
    if (applied) return;
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-3 rounded-[4px] border border-white/[0.08] bg-brand-surface-muted p-3 shadow-lg shadow-black/30">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-zinc-100">
              Proposed changes
            </span>
            <span className="rounded-[2px] bg-brand-purple px-1.5 py-px font-mono-tech text-[10px] font-bold text-white">
              {checked.length}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-zinc-400">
            Add a due date to tasks.
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-[2px] px-2 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider",
            applied
              ? "bg-brand-green/10 text-brand-green"
              : "bg-brand-cyan/10 text-brand-cyan",
          )}
        >
          {applied ? "Applied" : "Awaiting approval"}
        </span>
      </div>

      <div className="space-y-0.5 pt-1">
        {PLAN_ITEMS.map((item) => (
          <label
            key={item.id}
            className={cn(
              "flex items-start gap-2.5 rounded-[3px] p-1.5",
              applied
                ? "cursor-default"
                : "cursor-pointer hover:bg-white/[0.05]",
            )}
          >
            <input
              type="checkbox"
              checked={applied || checked.includes(item.id)}
              disabled={applied}
              onChange={() => toggle(item.id)}
              className="mt-[3px] h-3.5 w-3.5 shrink-0 cursor-pointer accent-brand-purple disabled:cursor-default"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] leading-snug text-zinc-100">
                {item.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 block truncate font-mono-tech text-[11px]",
                  item.pathTone === "cyan"
                    ? "text-brand-cyan"
                    : "text-zinc-500",
                )}
              >
                {item.path}
              </span>
            </span>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenDiff}
        className="flex w-full items-center justify-between rounded-[3px] bg-brand-dark px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05]"
      >
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-100">
          <ChevronsUpDown className="h-4 w-4 text-zinc-500" />
          View diff
        </span>
        <span className="flex items-center gap-2 font-mono-tech text-[11px]">
          <span className="font-medium text-brand-green">+18</span>
          <span className="font-medium text-rose-400">−2</span>
          <span className="text-zinc-500">lines across 5 files</span>
        </span>
      </button>

      {applied ? (
        <p className="pt-0.5 text-center text-[12px] text-zinc-400">
          Changes applied — you can undo this anytime.
        </p>
      ) : (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={onApply}
              className="flex h-9 items-center justify-center gap-2 rounded-[3px] bg-brand-purple px-3 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-purple/85"
            >
              <CheckCircle2 className="h-4 w-4" />
              Apply changes
            </button>
            <button
              type="button"
              onClick={onEditPlan}
              className="h-9 rounded-[3px] bg-white/[0.05] px-3 text-[13px] font-semibold text-zinc-100 transition-colors hover:bg-white/[0.09]"
            >
              Edit plan
            </button>
          </div>
          <p className="text-center text-[12px] text-zinc-400">
            You can undo this after it&apos;s applied.
          </p>
        </div>
      )}
    </div>
  );
}

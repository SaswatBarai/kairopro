"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { motion } from "motion/react";
import { ArrowUp, Bot, Loader2, X } from "lucide-react";
import type { ChangeRequest } from "@kairopro/contracts";

import {
  OPEN_STATUSES,
  useApproveChangeMutation,
  useCancelChangeMutation,
  useChangesQuery,
  useRequestChangeMutation,
} from "@/lib/queries/changes";
import { cn } from "@/lib/utils";
import { ChangePlanCard } from "./change-plan-card";

interface AgentPanelProps {
  projectId: string;
  width: number;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  className?: string;
  onOpenHistory: () => void;
  onDock?: () => void;
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[90%] rounded-[10px] rounded-tl-[3px] border border-white/[0.06] bg-brand-surface-muted px-3 py-2 text-[13px] leading-relaxed text-zinc-300">
      {children}
    </p>
  );
}

/** What the agent says for one request, by where it has got to. */
function AgentReply({
  change,
  busy,
  onApprove,
  onDiscard,
  onOpenHistory,
}: {
  change: ChangeRequest;
  busy: boolean;
  onApprove: () => void;
  onDiscard: () => void;
  onOpenHistory: () => void;
}) {
  if (change.status === "PLANNING") {
    return (
      <div
        className="flex items-center gap-2 text-[13px] text-zinc-400"
        role="status"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-cyan" />
        Working out a plan…
      </div>
    );
  }
  if (!change.plan) {
    return (
      <Bubble>
        {change.status === "CANCELLED"
          ? "Cancelled."
          : "I couldn't work out a plan for that. Try describing the change a little differently."}
      </Bubble>
    );
  }
  return (
    <div className="w-full space-y-2">
      <ChangePlanCard
        busy={busy}
        change={change}
        onApprove={onApprove}
        onDiscard={onDiscard}
        onOpenHistory={onOpenHistory}
      />
      {change.status === "FAILED" && (
        <Bubble>
          That change couldn&apos;t be applied, so nothing was changed.
        </Bubble>
      )}
      {change.status === "CANCELLED" && (
        <Bubble>Discarded — nothing was changed.</Bubble>
      )}
    </div>
  );
}

export function AgentPanel({
  projectId,
  width,
  inputRef,
  className,
  onOpenHistory,
  onDock,
}: AgentPanelProps) {
  const changes = useChangesQuery(projectId);
  const requestChange = useRequestChangeMutation(projectId);
  const approve = useApproveChangeMutation(projectId);
  const cancel = useCancelChangeMutation(projectId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Oldest first, like a conversation.
  const history = [...(changes.data ?? [])].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const open = history.find((c) => OPEN_STATUSES.has(c.status));
  const working = open?.status === "PLANNING" || open?.status === "APPLYING";
  const canSend = input.trim().length > 0 && !open && !requestChange.isPending;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history.length, open?.status]);

  const submit = () => {
    if (!canSend) return;
    requestChange.mutate(input.trim(), { onSuccess: () => setInput("") });
  };

  return (
    <aside
      style={{ width }}
      className={cn(
        "flex shrink-0 flex-col border-l border-white/[0.07] bg-brand-surface",
        className,
      )}
    >
      <div className="flex h-10 shrink-0 items-center gap-2.5 border-b border-white/[0.07] px-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-brand-purple/15">
          <Bot className="h-3.5 w-3.5 text-brand-purple-light" />
        </div>
        <span className="text-[13px] font-semibold text-zinc-100">
          Kairo Agent
        </span>
        <span
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono-tech text-[10px] font-medium uppercase tracking-[0.1em]",
            working
              ? "border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan"
              : "border-white/[0.08] bg-white/[0.04] text-zinc-400",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              working ? "animate-pulse bg-brand-cyan" : "bg-zinc-500",
            )}
          />
          {working ? "Working" : "Ready"}
        </span>
        <button
          type="button"
          title="Close panel"
          onClick={() => onDock?.()}
          className="flex h-6 w-6 items-center justify-center rounded-[3px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-3 py-3">
          {changes.isLoading && (
            <div className="flex items-center gap-2 text-[12px] text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </div>
          )}
          {changes.error && (
            <p className="text-[12px] text-zinc-400" role="alert">
              Couldn&apos;t load your changes. {changes.error.message}
            </p>
          )}
          {!changes.isLoading && history.length === 0 && !changes.error && (
            <p className="px-1 py-6 text-center text-[13px] leading-relaxed text-zinc-500">
              Describe a change and the agent will show you a plan before it
              touches anything.
            </p>
          )}

          {history.map((change) => (
            <motion.div
              key={change.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-2"
            >
              <div className="flex flex-col items-end gap-1">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-[10px] rounded-tr-[3px] bg-brand-purple px-3 py-2 text-[13px] leading-relaxed text-white">
                  {change.request}
                </p>
                <span className="px-1 font-mono-tech text-[10px] text-zinc-600">
                  {time(change.createdAt)}
                </span>
              </div>
              <AgentReply
                busy={approve.isPending || cancel.isPending}
                change={change}
                onApprove={() => approve.mutate(change.id)}
                onDiscard={() => cancel.mutate(change.id)}
                onOpenHistory={onOpenHistory}
              />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[0.07] bg-brand-surface-muted/50 p-3">
        <textarea
          ref={inputRef}
          value={input}
          rows={2}
          disabled={Boolean(open)}
          placeholder={
            open
              ? "Apply or discard the pending change first…"
              : "Describe a change…"
          }
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {requestChange.error && (
          <p className="mb-1 text-[12px] text-zinc-400" role="alert">
            {requestChange.error.message}
          </p>
        )}
        <p className="mt-1 text-center font-mono-tech text-[10px] text-zinc-600">
          The agent will show you a plan before changing anything.
        </p>
        <div className="mt-1.5 flex items-center justify-end">
          <button
            type="button"
            title="Send"
            disabled={!canSend}
            onClick={submit}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-[4px] bg-brand-purple text-white transition-opacity",
              canSend
                ? "hover:bg-brand-purple/85"
                : "cursor-default opacity-30",
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

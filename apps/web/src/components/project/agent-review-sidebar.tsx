"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUp, Bot, CheckCircle2, SlidersHorizontal } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";

type ChatMessage =
  | { id: number; kind: "user"; label: string; text: string }
  | { id: number; kind: "agent"; time: string; content: ReactNode };

function CodeSpan({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[3px] bg-brand-dark px-1 py-0.5 font-mono-tech text-[11px] text-brand-purple-light">
      {children}
    </code>
  );
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 0,
    kind: "user",
    label: "You • Gate 1 transfer",
    text: "Add subtasks to tasks",
  },
  {
    id: 1,
    kind: "agent",
    time: "14:02",
    content: (
      <p className="leading-relaxed">
        Added <CodeSpan>Subtask</CodeSpan> entity with 1-to-many relation from
        Task and <CodeSpan>onDelete: Cascade</CodeSpan>.
        <span className="mt-2 flex items-center gap-1.5 rounded-[3px] bg-brand-green/10 px-2 py-1 font-mono-tech text-[10px] text-brand-green">
          <CheckCircle2 className="h-3 w-3" />
          Updated Prisma schema and migration script.
        </span>
      </p>
    ),
  },
  {
    id: 2,
    kind: "user",
    label: "You",
    text: "Make sure assignee can be unassigned/optional",
  },
  {
    id: 3,
    kind: "agent",
    time: "14:05",
    content: (
      <div className="flex flex-col gap-2">
        <p className="leading-relaxed">
          Updated <CodeSpan>Task.assigneeId</CodeSpan> to nullable (
          <code className="font-mono-tech text-[11px] text-zinc-100">
            String?
          </code>
          ) with{" "}
          <code className="font-mono-tech text-[11px] text-zinc-100">
            SetNull
          </code>{" "}
          on delete behavior.
        </p>
        <div className="rounded-[3px] bg-brand-dark p-2 font-mono-tech text-[11px] text-zinc-400">
          <code>assigneeId String? @index</code>
        </div>
      </div>
    ),
  },
];

export function AgentReviewSidebar() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stream = streamRef.current;
    if (stream) stream.scrollTop = stream.scrollHeight;
  }, [messages]);

  const onSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      { id: prev.length, kind: "user", label: "You", text },
    ]);
    setInput("");

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length,
          kind: "agent",
          time: "Now",
          content: (
            <p className="leading-relaxed">
              Received refinement request:{" "}
              <CodeSpan>{`"${text.slice(0, 30)}..."`}</CodeSpan>. Schema queued
              for re-generation before Gate 3 approval.
            </p>
          ),
        },
      ]);
    }, 450);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <FadeIn
      className="flex w-full flex-col overflow-hidden rounded-lg bg-brand-surface shadow-md xl:sticky xl:top-[92px] xl:col-span-4"
      delay={0.1}
    >
      <div className="flex items-center justify-between bg-brand-surface-muted p-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-brand-purple-light" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight text-zinc-100">
              Request changes
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 font-mono-tech text-[10px] text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
              Kairo Agent standby
            </span>
          </div>
        </div>
        <button
          className="cursor-pointer p-1 text-zinc-400 transition-colors hover:text-zinc-100"
          title="Model configuration"
          type="button"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div
        className="flex max-h-[580px] flex-col gap-3 overflow-y-auto p-3"
        ref={streamRef}
      >
        {messages.map((message) => {
          if (message.kind === "user") {
            return (
              <div className="flex flex-col items-end gap-1" key={message.id}>
                <span className="font-mono-tech text-[10px] text-zinc-400">
                  {message.label}
                </span>
                <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-brand-purple p-2 text-xs text-white shadow-sm">
                  {message.text}
                </div>
              </div>
            );
          }

          return (
            <div className="flex flex-col items-start gap-1" key={message.id}>
              <div className="flex items-center gap-1.5">
                <span className="font-mono-tech text-[10px] font-semibold text-brand-purple-light">
                  Kairo Engine
                </span>
                <span className="font-mono-tech text-[10px] text-zinc-500">
                  {message.time}
                </span>
              </div>
              <div className="flex max-w-[92%] flex-col gap-2 rounded-lg bg-brand-surface-muted p-2 text-xs text-zinc-100">
                {message.content}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-2.5 bg-brand-surface-muted p-3">
        <form className="flex flex-col gap-2.5" onSubmit={onSubmit}>
          <textarea
            aria-label="Ask for a change"
            className="w-full resize-none rounded-md border border-white/[0.1] bg-brand-dark px-3 py-2 font-mono-tech text-xs text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple"
            placeholder="Ask for a change (e.g. add tags to Task)..."
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-mono-tech text-[10px] text-zinc-400">
              <span className="rounded border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 font-medium text-zinc-300">
                Enter
              </span>
              <span>send</span>
              <span className="text-zinc-600">•</span>
              <span className="rounded border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 font-medium text-zinc-300">
                Shift + Enter
              </span>
              <span>newline</span>
            </div>
            <button
              aria-label="Send message"
              className="flex items-center gap-1.5 rounded-md bg-brand-purple px-3 py-1.5 font-mono-tech text-xs font-medium text-white transition-colors hover:bg-brand-purple/85 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!input.trim()}
              title="Submit directive to agent"
              type="submit"
            >
              <span>Send</span>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="font-mono-tech text-[10px] leading-tight text-zinc-400">
            Changes here will re-generate the Prisma schema and migration DDL
            before Gate 3 approval.
          </p>
        </form>
      </div>
    </FadeIn>
  );
}

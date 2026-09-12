"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUp, Check, MessageSquare, MoreHorizontal } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage =
  | { id: number; kind: "user"; label: string; text: string }
  | { id: number; kind: "agent"; time: string; content: ReactNode };

function CodeSpan({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-white/[0.08] px-1 py-0.5 font-mono-tech text-[11px] text-zinc-100">
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
      <div className="space-y-1.5">
        <p>
          Added <CodeSpan>Subtask</CodeSpan> entity with 1-to-many relation from
          Task and <CodeSpan>onDelete: Cascade</CodeSpan>.
        </p>
        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-brand-green">
          <Check className="h-3 w-3" strokeWidth={3} />
          <span>Updated Prisma schema and migration script.</span>
        </div>
      </div>
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
      <div className="space-y-2">
        <p>
          Updated <CodeSpan>Task.assigneeId</CodeSpan> to nullable (
          <CodeSpan>String?</CodeSpan>) with SetNull on delete behavior.
        </p>
        <div className="rounded-[3px] border border-white/[0.08] bg-brand-dark p-2 font-mono-tech text-[11px] text-zinc-300">
          <code>assigneeId String? @index</code>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    kind: "user",
    label: "You • Gate 3",
    text: "Ensure /tasks/[id] supports deep linking and comments",
  },
  {
    id: 5,
    kind: "agent",
    time: "14:18",
    content: (
      <p>
        Configured dynamic route <CodeSpan>/tasks/[id]</CodeSpan> with SSR
        metadata and included <CodeSpan>CommentThread</CodeSpan> component in
        route tree.
      </p>
    ),
  },
];

export function AgentStructureSidebar() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stream = streamRef.current;
    if (stream) stream.scrollTop = stream.scrollHeight;
  }, [messages]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      { id: prev.length, kind: "user", label: "You • Gate 3", text },
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
            <p>
              Received refinement request:{" "}
              <CodeSpan>{`"${text.slice(0, 30)}..."`}</CodeSpan>. Route topology
              and component manifest queued for regeneration before build.
            </p>
          ),
        },
      ]);
    }, 450);
  };

  return (
    <FadeIn
      className="flex h-[740px] w-full shrink-0 flex-col rounded-lg border border-white/[0.08] bg-brand-surface-muted lg:w-[360px]"
      delay={0.12}
    >
      <div className="flex items-center justify-between rounded-t-lg border-b border-white/[0.08] bg-white/[0.04] p-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-white/[0.08] bg-white/[0.06] text-zinc-300">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold leading-none text-zinc-100">
              Request changes
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-mono-tech text-[10px] text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              <span>Kairo Agent standby</span>
            </div>
          </div>
        </div>
        <button
          aria-label="Chat options"
          className="cursor-pointer p-1 text-zinc-400 transition-colors hover:text-zinc-200"
          type="button"
        >
          <MoreHorizontal className="h-[15px] w-[15px]" />
        </button>
      </div>

      <div
        className="flex-1 space-y-4 overflow-y-auto p-4 font-mono-tech text-xs"
        ref={streamRef}
      >
        {messages.map((message) => {
          if (message.kind === "user") {
            return (
              <div className="flex flex-col items-end gap-1" key={message.id}>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {message.label}
                </div>
                <div className="max-w-[85%] rounded-lg rounded-tr-none bg-brand-purple px-3 py-2 text-left text-xs text-white">
                  {message.text}
                </div>
              </div>
            );
          }

          return (
            <div className="flex flex-col items-start gap-1" key={message.id}>
              <div className="text-[10px] text-zinc-500">
                Kairo Engine{" "}
                <span className="text-zinc-600">{message.time}</span>
              </div>
              <div className="max-w-[95%] space-y-1.5 rounded-lg rounded-tl-none border border-white/[0.08] bg-white/[0.05] p-3 leading-relaxed text-zinc-300">
                {message.content}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-b-lg border-t border-white/[0.08] bg-brand-dark p-3">
        <form
          className="relative rounded-md border border-white/[0.08] bg-brand-surface-muted transition-colors focus-within:border-brand-purple"
          onSubmit={onSubmit}
        >
          <Textarea
            aria-label="Feedback and instruction input"
            className="min-h-0 resize-none rounded-none border-0 bg-transparent p-2.5 pr-8 text-xs text-zinc-200 shadow-none outline-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
            placeholder="Ask for a change (e.g. add export route)..."
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            aria-label="Send message"
            className="absolute bottom-2 right-2 cursor-pointer rounded-[3px] bg-white/[0.06] p-1 text-zinc-400 transition-colors hover:bg-brand-purple hover:text-white"
            type="submit"
          >
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </form>
        <p className="text-[10px] leading-tight text-zinc-500">
          Changes here will re-generate route topology and component manifest
          before build.
        </p>
      </div>
    </FadeIn>
  );
}

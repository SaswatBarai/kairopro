"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Send, Terminal } from "lucide-react";

type ChatMessage =
  | { id: number; kind: "system"; text: string }
  | { id: number; kind: "user"; text: string; time: string }
  | { id: number; kind: "agent"; content: ReactNode; time: string };

function CodeSpan({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-white/[0.08] px-1 font-mono-tech text-[11px] text-zinc-100">
      {children}
    </span>
  );
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: 0, kind: "system", text: "Agent initialized with PRD-001 schema" },
  {
    id: 1,
    kind: "user",
    text: "Add subtasks to tasks",
    time: "14:02:18",
  },
  {
    id: 2,
    kind: "agent",
    content: (
      <>
        Done — added a <CodeSpan>Subtask</CodeSpan> model with a self-reference
        to <CodeSpan>Task</CodeSpan>. This also adds subtask endpoints to the
        API.
      </>
    ),
    time: "14:02:22",
  },
];

export function AgentChatPanel() {
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
      { id: prev.length, kind: "user", text, time: "Now" },
    ]);
    setInput("");

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length,
          kind: "agent",
          content: (
            <>
              Received refinement request:{" "}
              <CodeSpan>{`"${text.slice(0, 30)}..."`}</CodeSpan>. Schema graph
              queued for rebuild on gate approval.
            </>
          ),
          time: "Just now",
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
    <div className="flex h-[680px] flex-col rounded-lg border border-white/[0.08] bg-brand-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-brand-surface-muted px-3 py-2">
        <div>
          <h4 className="text-sm font-semibold text-zinc-100">
            Request changes
          </h4>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            <span className="font-mono-tech text-[10px] text-zinc-400">
              Kairo Agent standby
            </span>
          </div>
        </div>
        <Terminal className="h-[18px] w-[18px] text-zinc-400" />
      </div>

      <div
        className="flex-1 space-y-3 overflow-y-auto bg-brand-dark p-3"
        id="chatStream"
        ref={streamRef}
      >
        {messages.map((message) => {
          if (message.kind === "system") {
            return (
              <div className="text-center" key={message.id}>
                <span className="rounded-[3px] bg-white/[0.06] px-2 py-0.5 font-mono-tech text-[10px] text-zinc-500">
                  {message.text}
                </span>
              </div>
            );
          }

          if (message.kind === "user") {
            return (
              <div className="flex flex-col items-end" key={message.id}>
                <div className="max-w-[85%] whitespace-pre-wrap rounded-[3px] bg-white/[0.06] px-2 py-1.5 text-xs text-zinc-100">
                  {message.text}
                </div>
                <span className="mt-0.5 font-mono-tech text-[10px] text-zinc-600">
                  {message.time}
                </span>
              </div>
            );
          }

          return (
            <div className="flex flex-col items-start" key={message.id}>
              <div className="mb-1 flex items-center gap-1">
                <span className="font-mono-tech text-[11px] font-semibold text-brand-purple-light">
                  kairo-engine
                </span>
              </div>
              <div className="max-w-[90%] rounded-[3px] border border-white/[0.08] bg-brand-surface-muted px-2 py-1 text-xs leading-relaxed text-zinc-400">
                {message.content}
              </div>
              <span className="mt-0.5 font-mono-tech text-[10px] text-zinc-600">
                {message.time}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/[0.08] bg-brand-surface-muted p-3">
        <form
          className="flex flex-col gap-2.5"
          id="chatForm"
          onSubmit={onSubmit}
        >
          <textarea
            aria-label="Ask for a change"
            className="w-full resize-none rounded-md border border-white/[0.1] bg-brand-dark px-3 py-2 font-mono-tech text-xs text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple"
            id="chatInput"
            placeholder="Ask for a change..."
            rows={3}
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
              aria-label="Send request"
              className="flex items-center gap-1.5 rounded-md bg-brand-purple px-3 py-1.5 font-mono-tech text-xs font-medium text-white transition-all hover:bg-brand-purple/85 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!input.trim()}
              type="submit"
            >
              <span>Send</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="font-mono-tech text-[10px] leading-tight text-zinc-500">
            Changes here will update the PRD and underlying schema before
            approval.
          </p>
        </form>
      </div>
    </div>
  );
}

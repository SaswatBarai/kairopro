"use client";

import { useRef, useState, type RefObject } from "react";
import { motion } from "motion/react";
import {
  ArrowUp,
  Bot,
  CheckCircle2,
  Circle,
  Ellipsis,
  FileDiff,
  FilePlus,
  Loader2,
  Terminal,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface AgentPanelProps {
  width: number;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  className?: string;
}

const TIMELINE = [
  { label: "Read specification", state: "done" },
  { label: "Generated data model", state: "done" },
  { label: "Created API routes", state: "done" },
  { label: "Running application", state: "active" },
  { label: "Running integration tests", state: "pending" },
  { label: "Deploy", state: "pending" },
] as const;

type Message =
  | { role: "user"; text: string }
  | { role: "agent"; text: string }
  | {
      role: "tool";
      tool: "created" | "modified" | "ran";
      label: string;
      detail?: string;
    };

const INITIAL_MESSAGES: Message[] = [
  { role: "user", text: "Add subtasks to tasks." },
  {
    role: "agent",
    text: "I'll update the Prisma schema, API routes, and task UI.",
  },
  { role: "tool", tool: "created", label: "prisma/schema.prisma" },
  { role: "tool", tool: "modified", label: "app/api/tasks/route.ts" },
  { role: "tool", tool: "ran", label: "npm test", detail: "✓ 24 passed" },
];

const ATTACHABLES = [
  "prisma/schema.prisma",
  "app/api/tasks/route.ts",
  "components/task-card.tsx",
];

const REPLIES = [
  "Understood — I'll draft a plan before touching anything.",
  "On it — I'll wire that through the schema, API, and UI.",
  "Got it. I'll ship that as a patch and re-run the tests.",
];

function ToolIcon({ tool }: { tool: "created" | "modified" | "ran" }) {
  if (tool === "created")
    return (
      <FilePlus className="h-3.5 w-3.5 shrink-0 text-brand-purple-light" />
    );
  if (tool === "modified")
    return <FileDiff className="h-3.5 w-3.5 shrink-0 text-brand-cyan" />;
  return <Terminal className="h-3.5 w-3.5 shrink-0 text-brand-green" />;
}

function ToolVerb({ tool }: { tool: "created" | "modified" | "ran" }) {
  if (tool === "created") return "created";
  if (tool === "modified") return "modified";
  return "ran";
}

export function AgentPanel({ width, inputRef, className }: AgentPanelProps) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [replyIndex, setReplyIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setAttachments([]);
    scrollToBottom();
    const reply = REPLIES[replyIndex % REPLIES.length] ?? REPLIES[0] ?? "";
    setReplyIndex((i) => i + 1);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "agent", text: reply }]);
      scrollToBottom();
    }, 600);
  };

  const attach = () => {
    setAttachments((prev) => {
      const next = ATTACHABLES.find((a) => !prev.includes(a));
      return next ? [...prev, next] : prev;
    });
  };

  const hasContent = input.trim().length > 0 || attachments.length > 0;

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
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-brand-cyan/25 bg-brand-cyan/10 px-2 py-0.5 font-mono-tech text-[10px] font-medium uppercase tracking-[0.1em] text-brand-cyan">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-cyan" />
          Working
        </span>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          className="border-b border-white/[0.06] px-3 py-3"
        >
          <p className="mb-2 font-mono-tech text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
            Activity
          </p>
          <div className="flex flex-col gap-1.5">
            {TIMELINE.map((step) => (
              <motion.div
                key={step.label}
                variants={{
                  hidden: { opacity: 0, y: 4 },
                  show: { opacity: 1, y: 0 },
                }}
                className="flex items-center gap-2 text-xs"
              >
                {step.state === "done" && (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-green" />
                )}
                {step.state === "active" && (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-cyan" />
                )}
                {step.state === "pending" && (
                  <Circle className="h-3 w-3 shrink-0 text-zinc-600" />
                )}
                <span
                  className={cn(
                    step.state === "done" && "text-zinc-300",
                    step.state === "active" && "text-zinc-100",
                    step.state === "pending" && "text-zinc-500",
                  )}
                >
                  {step.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="flex flex-col gap-2.5 px-3 py-3">
          {messages.map((message, i) =>
            message.role === "tool" ? (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-[3px] border border-white/[0.06] bg-brand-surface-muted/60 px-2 py-1.5 font-mono-tech text-[11px]"
              >
                <ToolIcon tool={message.tool} />
                <span className="truncate text-zinc-300">{message.label}</span>
                <span className="shrink-0 text-zinc-500">
                  {message.detail ?? <ToolVerb tool={message.tool} />}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <p
                  className={cn(
                    "max-w-[85%] rounded-[10px] px-3 py-2 text-[13px] leading-relaxed",
                    message.role === "user"
                      ? "rounded-tr-[3px] bg-brand-purple text-white"
                      : "rounded-tl-[3px] border border-white/[0.06] bg-brand-surface-muted text-zinc-300",
                  )}
                >
                  {message.text}
                </p>
              </motion.div>
            ),
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[0.07] bg-brand-surface-muted/50 p-3">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((a) => (
              <span
                key={a}
                className="flex items-center gap-1.5 rounded-[3px] border border-white/[0.08] bg-brand-surface px-2 py-1 font-mono-tech text-[11px] text-zinc-300"
              >
                <FilePlus className="h-3 w-3 text-brand-purple-light" />
                {a}
                <button
                  type="button"
                  title="Remove"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((p) => p !== a))
                  }
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-[2px] text-zinc-500 hover:text-zinc-200"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={inputRef}
          value={input}
          rows={2}
          placeholder="Ask Kairo to change the application..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600"
        />
        <div className="mt-1.5 flex items-center gap-0.5">
          <button
            type="button"
            title="Attach file"
            onClick={attach}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <FilePlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="More"
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <Ellipsis className="h-4 w-4" />
          </button>
          <div className="ml-auto flex items-center gap-1">
            {hasContent && (
              <button
                type="button"
                title="Clear"
                onClick={() => {
                  setInput("");
                  setAttachments([]);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              title="Send"
              onClick={submit}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-[4px] bg-brand-purple text-white transition-opacity",
                input.trim()
                  ? "hover:bg-brand-purple/85"
                  : "cursor-default opacity-30",
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

"use client";

import type { ReactNode } from "react";
import { Terminal, X } from "lucide-react";

interface LogLine {
  time: string;
  level: string;
  levelClass: string;
  message: ReactNode;
}

const LOG_LINES: LogLine[] = [
  {
    time: "[00:00:01]",
    level: "INFO",
    levelClass: "font-semibold text-brand-purple-light",
    message:
      "Initializing sandbox runtime environment for spec #0482 (TaskFlow)...",
  },
  {
    time: "[00:00:03]",
    level: "INFO",
    levelClass: "font-semibold text-brand-purple-light",
    message:
      "Parsing PRD entities: User, Workspace, Task, Subtask, ActivityLog, Tag.",
  },
  {
    time: "[00:00:09]",
    level: "ADAPT",
    levelClass: "text-brand-cyan",
    message:
      "Subtask recursion restricted to depth=1 (performance heuristic triggered).",
  },
  {
    time: "[00:00:15]",
    level: "INFO",
    levelClass: "font-semibold text-brand-purple-light",
    message: "PostgreSQL prisma migrate dev --name init finished cleanly.",
  },
  {
    time: "[00:00:32]",
    level: "SUCCESS",
    levelClass: "text-brand-green",
    message:
      "Created 9 Next.js API endpoints with runtime input validation (zod).",
  },
  {
    time: "[00:01:02]",
    level: "INFO",
    levelClass: "font-semibold text-brand-purple-light",
    message:
      "Bundling Kanban canvas with client-side optimistic drag-and-drop primitives.",
  },
  {
    time: "[00:01:21]",
    level: "SUCCESS",
    levelClass: "text-brand-green",
    message:
      "Vitest: 14 test suites passed (14/14 tests, 0 assertions failed).",
  },
  {
    time: "[00:01:42]",
    level: "READY",
    levelClass: "font-bold text-brand-green",
    message:
      "Deployed preview worker node to edge proxy: https://taskflow-preview-0482.kairo.dev",
  },
];

export function BuildLogsDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-brand-dark p-3 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5 font-mono-tech text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5 text-zinc-100">
          <Terminal className="h-4 w-4 text-brand-green" />
          <span>stdout / taskflow-build-0482.log</span>
        </span>
        <button
          className="cursor-pointer transition-colors hover:text-zinc-100"
          title="Close logs"
          type="button"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <pre className="select-text overflow-x-auto rounded-[3px] bg-black/40 p-2 font-mono-tech text-[11px] leading-relaxed text-zinc-400">
        {LOG_LINES.map((line, index) => (
          <div key={line.time}>
            <span className="text-zinc-600">{line.time}</span>{" "}
            <span className={line.levelClass}>{line.level}</span>{" "}
            <span>{line.message}</span>
            {index < LOG_LINES.length - 1 ? "\n" : ""}
          </div>
        ))}
      </pre>
    </div>
  );
}

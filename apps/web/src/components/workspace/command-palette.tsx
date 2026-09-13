"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bot,
  Eye,
  GitFork,
  History,
  Rocket,
  RotateCcw,
  Search,
  Terminal,
  Zap,
  Ellipsis,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { FILES, basename, dirname, fileTone } from "./code-content";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenFile: (path: string) => void;
  onCommand: (id: string) => void;
}

interface CommandItem {
  id: string;
  icon: typeof Rocket;
  label: string;
}

const COMMANDS: CommandItem[] = [
  { id: "run", icon: Rocket, label: "Run sandbox" },
  { id: "restart", icon: RotateCcw, label: "Restart sandbox" },
  { id: "deploy", icon: Zap, label: "Deploy to production" },
  { id: "toggle-terminal", icon: Terminal, label: "Toggle terminal" },
  { id: "preview", icon: Eye, label: "Open preview" },
  { id: "ask", icon: Bot, label: "Ask Kairo" },
  { id: "history", icon: History, label: "History & checkpoints" },
  { id: "branch", icon: GitFork, label: "Git branch" },
  { id: "settings", icon: Ellipsis, label: "Settings" },
];

type Row =
  { type: "file"; path: string } | { type: "command"; command: CommandItem };

export function CommandPalette({
  open,
  onClose,
  onOpenFile,
  onCommand,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef<HTMLButtonElement>(null);

  const q = query.trim().toLowerCase();
  const fileRows = Object.keys(FILES)
    .filter(
      (path) =>
        !q ||
        basename(path).toLowerCase().includes(q) ||
        path.toLowerCase().includes(q),
    )
    .map((path) => ({ type: "file" as const, path }));
  const commandRows = COMMANDS.filter(
    (c) => !q || c.label.toLowerCase().includes(q),
  ).map((command) => ({ type: "command" as const, command }));
  const rows: Row[] = [...fileRows, ...commandRows];

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const activate = (row: Row) => {
    if (row.type === "file") onOpenFile(row.path);
    else onCommand(row.command.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 px-4 pt-[14vh] backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] overflow-hidden rounded-[4px] border border-white/[0.1] bg-brand-surface shadow-2xl shadow-black/60"
          >
            <div className="flex h-11 items-center gap-2.5 border-b border-white/[0.07] px-3">
              <Search className="h-4 w-4 shrink-0 text-zinc-500" />
              <input
                autoFocus
                value={query}
                placeholder="Search files..."
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(i - 1, 0));
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const row = rows[activeIndex];
                    if (row) activate(row);
                  }
                }}
                className="w-full bg-transparent text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600"
              />
              <kbd className="shrink-0 rounded-[3px] border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 font-mono-tech text-[10px] text-zinc-500">
                esc
              </kbd>
            </div>
            <div className="max-h-[320px] overflow-y-auto py-1">
              {rows.length === 0 && (
                <p className="py-6 text-center font-mono-tech text-[11px] text-zinc-600">
                  No results
                </p>
              )}
              {fileRows.length > 0 && (
                <p className="px-3 pb-1 pt-2 font-mono-tech text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                  Files
                </p>
              )}
              {fileRows.map((row) => {
                const index = rows.indexOf(row);
                const active = index === activeIndex;
                return (
                  <button
                    key={row.path}
                    type="button"
                    ref={active ? activeRef : undefined}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => activate(row)}
                    className={cn(
                      "flex h-8 w-full items-center gap-2.5 px-3 text-left",
                      active ? "bg-white/[0.05]" : "",
                    )}
                  >
                    <span
                      className={cn(
                        "h-[5px] w-[5px] shrink-0 rounded-full",
                        fileTone(row.path),
                      )}
                    />
                    <span className="font-mono-tech text-[12px] text-zinc-200">
                      {basename(row.path)}
                    </span>
                    <span className="ml-auto truncate pl-3 font-mono-tech text-[10px] text-zinc-600">
                      {dirname(row.path)}
                    </span>
                  </button>
                );
              })}
              {commandRows.length > 0 && (
                <p className="px-3 pb-1 pt-2 font-mono-tech text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                  Commands
                </p>
              )}
              {commandRows.map((row) => {
                const index = rows.indexOf(row);
                const active = index === activeIndex;
                const Icon = row.command.icon;
                return (
                  <button
                    key={row.command.id}
                    type="button"
                    ref={active ? activeRef : undefined}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => activate(row)}
                    className={cn(
                      "flex h-8 w-full items-center gap-2.5 px-3 text-left",
                      active ? "bg-white/[0.05]" : "",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    <span className="text-[12px] text-zinc-200">
                      {row.command.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

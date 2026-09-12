"use client";

import { Bot, Files, GitFork, Search, Terminal } from "lucide-react";

import { cn } from "@/lib/utils";

interface ActivityRailProps {
  paletteOpen: boolean;
  explorerOpen: boolean;
  sandboxExpanded: boolean;
  agentOpen: boolean;
  onSearch: () => void;
  onToggleExplorer: () => void;
  onToggleSandbox: () => void;
  onToggleAgent: () => void;
}

interface RailButtonProps {
  title: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function RailButton({ title, active, onClick, children }: RailButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-[5px] transition-colors",
        active
          ? "bg-brand-purple/15 text-brand-purple-light"
          : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200",
      )}
    >
      {children}
    </button>
  );
}

export function ActivityRail({
  paletteOpen,
  explorerOpen,
  sandboxExpanded,
  agentOpen,
  onSearch,
  onToggleExplorer,
  onToggleSandbox,
  onToggleAgent,
}: ActivityRailProps) {
  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-white/[0.07] bg-brand-surface py-2">
      <RailButton title="Search (⌘P)" active={paletteOpen} onClick={onSearch}>
        <Search className="h-[18px] w-[18px]" />
      </RailButton>
      <RailButton
        title="Files (⌘B)"
        active={explorerOpen}
        onClick={onToggleExplorer}
      >
        <Files className="h-[18px] w-[18px]" />
      </RailButton>
      <RailButton title="Source control" active={false} onClick={() => {}}>
        <GitFork className="h-[18px] w-[18px]" />
      </RailButton>
      <RailButton
        title="Terminal (⌘J)"
        active={sandboxExpanded}
        onClick={onToggleSandbox}
      >
        <Terminal className="h-[18px] w-[18px]" />
      </RailButton>
      <RailButton
        title="Kairo Agent"
        active={agentOpen}
        onClick={onToggleAgent}
      >
        <Bot className="h-[18px] w-[18px]" />
      </RailButton>
      <div className="mt-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-brand-purple to-brand-cyan text-[9px] font-bold text-white">
        SB
      </div>
    </nav>
  );
}

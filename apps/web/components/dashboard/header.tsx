"use client";

import { Plus, Search, Bell } from "lucide-react";

interface HeaderProps {
  onNewProject: () => void;
}

export function Header({ onNewProject }: HeaderProps) {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search projects or documents..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-800/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
        </button>

        <button
          onClick={onNewProject}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>
    </header>
  );
}

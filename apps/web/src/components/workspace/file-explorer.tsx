"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronsDownUp,
  ChevronDown,
  ChevronRight,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  GitFork,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ROOT, fileBadge, fileTone, type TreeNode } from "./code-content";

interface FileExplorerProps {
  width: number;
  activeFile: string | null;
  className?: string;
  onOpenFile: (path: string) => void;
  onSearch: () => void;
}

interface TreeRowsProps {
  nodes: TreeNode[];
  depth: number;
  expanded: string[];
  onToggleFolder: (path: string) => void;
  activeFile: string | null;
  onOpenFile: (path: string) => void;
}

function TreeRows({
  nodes,
  depth,
  expanded,
  onToggleFolder,
  activeFile,
  onOpenFile,
}: TreeRowsProps) {
  return (
    <div>
      {nodes.map((node) =>
        node.kind === "folder" ? (
          <div key={node.path}>
            <button
              type="button"
              onClick={() => onToggleFolder(node.path)}
              style={{ paddingLeft: 10 + depth * 14 }}
              className="flex h-[26px] w-full items-center gap-1.5 pr-2 text-left text-[12px] text-zinc-300 transition-colors hover:bg-white/[0.04]"
            >
              {expanded.includes(node.path) ? (
                <ChevronDown className="h-3 w-3 shrink-0 text-zinc-500" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0 text-zinc-500" />
              )}
              {expanded.includes(node.path) ? (
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-brand-purple-light/80" />
              ) : (
                <Folder className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              )}
              <span className="truncate">{node.name}</span>
            </button>
            <AnimatePresence initial={false}>
              {expanded.includes(node.path) && (
                <motion.div
                  key="children"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <TreeRows
                    nodes={node.children ?? []}
                    depth={depth + 1}
                    expanded={expanded}
                    onToggleFolder={onToggleFolder}
                    activeFile={activeFile}
                    onOpenFile={onOpenFile}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            key={node.path}
            type="button"
            onClick={() => onOpenFile(node.path)}
            style={{ paddingLeft: 10 + depth * 14 + 18 }}
            className={cn(
              "flex h-[26px] w-full items-center gap-2 pr-2 text-left text-[12px] transition-colors",
              activeFile === node.path
                ? "bg-brand-purple/10 text-white"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
            )}
          >
            <span
              className={cn(
                "h-[5px] w-[5px] shrink-0 rounded-full",
                fileTone(node.path),
              )}
            />
            <span className="truncate">{node.name}</span>
            {fileBadge(node.path) && (
              <span className="ml-auto shrink-0 rounded-[2px] border border-white/[0.08] px-1 font-mono-tech text-[9px] text-zinc-500">
                {fileBadge(node.path)}
              </span>
            )}
          </button>
        ),
      )}
    </div>
  );
}

export function FileExplorer({
  width,
  activeFile,
  className,
  onOpenFile,
  onSearch,
}: FileExplorerProps) {
  const [tree, setTree] = useState<TreeNode>(ROOT);
  const [expanded, setExpanded] = useState<string[]>([
    "taskflow",
    "app",
    "app/api",
    "app/api/tasks",
    "components",
    "lib",
    "prisma",
    "tests",
  ]);
  const [nextId, setNextId] = useState(1);

  const toggleFolder = (path: string) => {
    setExpanded((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  };

  const addFile = () => {
    const name = `untitled-${nextId}.ts`;
    setTree((prev) => ({
      ...prev,
      children: [...(prev.children ?? []), { name, path: name, kind: "file" }],
    }));
    setNextId((n) => n + 1);
    onOpenFile(name);
  };

  const addFolder = () => {
    const name = `new-folder-${nextId}`;
    setTree((prev) => ({
      ...prev,
      children: [
        ...(prev.children ?? []),
        { name, path: name, kind: "folder", children: [] },
      ],
    }));
    setNextId((n) => n + 1);
    setExpanded((prev) => [...prev, name]);
  };

  const collapseAll = () => setExpanded(["taskflow"]);

  return (
    <aside
      style={{ width }}
      className={cn(
        "flex shrink-0 flex-col border-r border-white/[0.07] bg-brand-surface",
        className,
      )}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.07] px-3">
        <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Files
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="New file"
            onClick={addFile}
            className="flex h-6 w-6 items-center justify-center rounded-[3px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="New folder"
            onClick={addFolder}
            className="flex h-6 w-6 items-center justify-center rounded-[3px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Search files"
            onClick={onSearch}
            className="flex h-6 w-6 items-center justify-center rounded-[3px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Collapse folders"
            onClick={collapseAll}
            className="flex h-6 w-6 items-center justify-center rounded-[3px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        <button
          type="button"
          onClick={() => toggleFolder(tree.path)}
          className="flex h-[26px] w-full items-center gap-1.5 px-2.5 text-left text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.04]"
        >
          {expanded.includes(tree.path) ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-zinc-500" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-zinc-500" />
          )}
          {expanded.includes(tree.path) ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-brand-purple-light" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          )}
          <span className="truncate">{tree.name}</span>
        </button>
        <AnimatePresence initial={false}>
          {expanded.includes(tree.path) && (
            <motion.div
              key="root-children"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <TreeRows
                nodes={tree.children ?? []}
                depth={1}
                expanded={expanded}
                onToggleFolder={toggleFolder}
                activeFile={activeFile}
                onOpenFile={onOpenFile}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex h-8 shrink-0 items-center gap-2 border-t border-white/[0.07] px-3 font-mono-tech text-[10px] text-zinc-500">
        <GitFork className="h-3 w-3 text-brand-purple-light" />
        <span className="truncate">feat/taskflow</span>
        <span className="ml-auto shrink-0 text-zinc-400">+2 ~1</span>
      </div>
    </aside>
  );
}

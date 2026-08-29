"use client";

import { File, Folder, FolderOpen } from "lucide-react";

export function FileTree({ files, activeFile, onSelect }: { files: any[], activeFile: string | null, onSelect: (path: string) => void }) {
    
    // Simplistic rendering of flat paths. A real one would build a nested tree structure.
    // Assuming backend returns paths like "package.json", "src/index.ts"
    
    if (files.length === 0) return <div className="text-xs text-slate-500 p-2">Workspace empty</div>;

    return (
        <div className="space-y-0.5">
            {files.map((f, i) => (
                <button
                    key={i}
                    onClick={() => !f.isDirectory && onSelect(f.path)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
                        activeFile === f.path 
                        ? "bg-indigo-600/20 text-indigo-300" 
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                >
                    {f.isDirectory ? (
                        <Folder className="w-4 h-4 text-slate-500" />
                    ) : (
                        <File className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="truncate">{f.path}</span>
                </button>
            ))}
        </div>
    );
}

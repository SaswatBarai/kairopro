"use client";

import { useState } from "react";
import { History, Undo, FileDiff, ChevronDown, ChevronRight } from "lucide-react";

export function ChangeSetViewer({ projectId, changeSets }: { projectId: string, changeSets: any[] }) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const [isRollingBack, setIsRollingBack] = useState<string | null>(null);

    const handleRollback = async (csId: string) => {
        setIsRollingBack(csId);
        try {
            await fetch(`/api/projects/${projectId}/change-sets/${csId}/rollback`, { method: "POST" });
            window.location.reload();
        } catch (e) {
            console.error(e);
        } finally {
            setIsRollingBack(null);
        }
    };

    if (changeSets.length === 0) return <div className="text-sm text-slate-500">No code changes made yet.</div>;

    return (
        <div className="space-y-4">
            {changeSets.map((cs) => (
                <div key={cs.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div 
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
                        onClick={() => setExpanded(expanded === cs.id ? null : cs.id)}
                    >
                        <div className="flex items-center gap-3">
                            {expanded === cs.id ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                            <div>
                                <div className="font-semibold text-slate-200 flex items-center gap-2">
                                    <History className="w-4 h-4 text-indigo-400" /> 
                                    {cs.description}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">{new Date(cs.createdAt).toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {cs.status === "rolled_back" && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">Rolled Back</span>}
                            {cs.status === "applied" && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleRollback(cs.id); }}
                                    disabled={isRollingBack === cs.id}
                                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded flex items-center gap-1.5"
                                >
                                    <Undo className="w-3.5 h-3.5" /> 
                                    {isRollingBack === cs.id ? "Rolling back..." : "Rollback"}
                                </button>
                            )}
                        </div>
                    </div>
                    {expanded === cs.id && (
                        <div className="border-t border-slate-800 p-4 bg-black/20">
                            {cs.fileChanges.map((fc: any, i: number) => (
                                <div key={i} className="mb-4 last:mb-0">
                                    <div className="text-sm font-mono text-slate-400 flex items-center gap-2 mb-2">
                                        <FileDiff className="w-4 h-4 text-slate-500" /> {fc.filePath} <span className="text-xs text-emerald-500 uppercase">{fc.action}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {fc.contentBefore && (
                                            <div className="bg-red-950/20 border border-red-900/30 rounded p-3 overflow-x-auto text-xs font-mono text-red-200/70">
                                                <pre>{fc.contentBefore}</pre>
                                            </div>
                                        )}
                                        {fc.contentAfter && (
                                            <div className={`border border-emerald-900/30 rounded p-3 overflow-x-auto text-xs font-mono text-emerald-200/70 ${!fc.contentBefore ? 'col-span-2 bg-emerald-950/10' : 'bg-emerald-950/20'}`}>
                                                <pre>{fc.contentAfter}</pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

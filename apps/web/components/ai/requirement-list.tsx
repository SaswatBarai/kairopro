"use client";

import { useState } from "react";
import { Check, Lock, Unlock, AlertTriangle } from "lucide-react";
import { ClarificationPanel } from "./clarification-panel";

interface RequirementListProps {
  projectId: string;
  requirements: any[];
  onUpdate: () => void;
}

export function RequirementList({ projectId, requirements, onUpdate }: RequirementListProps) {
  const [lockingId, setLockingId] = useState<string | null>(null);

  const toggleLock = async (reqId: string, currentStatus: string) => {
    setLockingId(reqId);
    try {
      const newStatus = currentStatus === "locked" ? "draft" : "locked";
      await fetch(`/api/projects/${projectId}/requirements`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirementId: reqId,
          status: newStatus
        })
      });
      onUpdate();
    } finally {
      setLockingId(null);
    }
  };

  if (!requirements.length) {
    return <div className="text-center p-8 text-slate-500">No requirements extracted yet.</div>;
  }

  return (
    <div className="space-y-4">
      {requirements.map((req) => {
        const needsClarification = req.confidence < 0.7 && !req.userAnswer;
        const isLocked = req.status === "locked" || req.status === "approved";

        return (
          <div key={req.id} className={`p-5 border rounded-xl transition-all ${
            isLocked ? "bg-slate-900/40 border-emerald-900/30" : 
            needsClarification ? "bg-slate-900 border-indigo-900/50" : 
            "bg-slate-900 border-slate-800"
          }`}>
            <div className="flex justify-between items-start gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`text-base font-semibold ${isLocked ? "text-emerald-400" : "text-slate-200"}`}>
                    {req.title}
                  </h3>
                  {needsClarification && (
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      <AlertTriangle className="w-3 h-3" /> Clarification
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">{req.description}</p>
              </div>
              
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                  req.confidence >= 0.8 ? "bg-emerald-500/10 text-emerald-400" :
                  req.confidence >= 0.7 ? "bg-amber-500/10 text-amber-400" :
                  "bg-red-500/10 text-red-400"
                }`}>
                  {Math.round(req.confidence * 100)}% Match
                </span>
                
                <button
                  onClick={() => toggleLock(req.id, req.status)}
                  disabled={lockingId === req.id || needsClarification}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isLocked 
                      ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30" 
                      : needsClarification
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  {isLocked ? "Locked" : "Lock"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              <span className="px-2 py-1 bg-slate-950 rounded border border-slate-800">{req.category}</span>
              <span className="px-2 py-1 bg-slate-950 rounded border border-slate-800">{req.priority}</span>
            </div>

            {needsClarification && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <ClarificationPanel 
                  projectId={projectId} 
                  requirement={req} 
                  onAnswerSubmit={onUpdate} 
                />
              </div>
            )}
            
            {!needsClarification && req.userAnswer && (
              <div className="mt-3 p-3 bg-slate-950 rounded-lg text-xs border border-slate-800">
                <span className="text-slate-500 font-medium">Your answer: </span>
                <span className="text-slate-300">{req.userAnswer}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

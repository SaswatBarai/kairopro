"use client";

import { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";

export function AIChatPanel({ projectId, currentArch, onUpdated }: { projectId: string, currentArch: any, onUpdated: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [isModifying, setIsModifying] = useState(false);

  const handleModify = async () => {
    if (!prompt.trim()) return;

    setIsModifying(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/architecture/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentArch, prompt })
      });
      
      if (res.ok) {
        setPrompt("");
        onUpdated(); // refresh arch view
      } else {
        alert("Failed to modify architecture.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to modify architecture.");
    } finally {
      setIsModifying(false);
    }
  };

  return (
    <div className="w-80 bg-indigo-950/20 border-l border-indigo-900/50 flex flex-col shrink-0 rounded-r-2xl overflow-hidden">
      <div className="p-4 border-b border-indigo-900/50 bg-indigo-950/40 flex items-center gap-2 text-indigo-300 font-semibold">
        <Sparkles className="w-4 h-4 text-indigo-400" /> Architect AI
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        <div className="bg-indigo-900/20 border border-indigo-800/30 p-3 rounded-xl text-sm text-indigo-200">
          I've generated this architecture based on your PRD. Review the tabs. Want to change the DB or add a service? Just ask!
        </div>
      </div>

      <div className="p-4 bg-slate-900/80 border-t border-slate-800">
        <div className="relative">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g. Change database to MongoDB..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none h-24"
            />
            <button
                onClick={handleModify}
                disabled={isModifying || !prompt.trim()}
                className="absolute right-3 bottom-3 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all"
            >
                {isModifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { HelpCircle, Send, Loader2 } from "lucide-react";

interface ClarificationPanelProps {
  projectId: string;
  requirement: any;
  onAnswerSubmit: () => void;
}

export function ClarificationPanel({ projectId, requirement, onAnswerSubmit }: ClarificationPanelProps) {
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setIsSubmitting(true);
    try {
      // Save answer
      await fetch(`/api/projects/${projectId}/requirements`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirementId: requirement.id,
          userAnswer: answer,
          status: "draft" // Resets status so AI knows it's answered but needs re-evaluation
        })
      });
      
      onAnswerSubmit();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 bg-indigo-950/20 border border-indigo-900/50 rounded-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
      
      <div className="flex gap-3 items-start">
        <HelpCircle className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="text-sm font-medium text-slate-200">Clarification Needed</h4>
            <p className="text-xs text-slate-400 mt-1">Regarding: {requirement.title}</p>
          </div>
          
          <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg text-sm text-indigo-100">
            {requirement.clarificationQuestion}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!answer.trim() || isSubmitting}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

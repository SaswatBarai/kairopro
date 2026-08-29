"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle, Terminal } from "lucide-react";

interface AnalysisProgressProps {
  projectId: string;
  runId: string;
  onComplete: () => void;
}

interface AgentEvent {
  type: string;
  data: any;
}

export function AnalysisProgress({ projectId, runId, onComplete }: AnalysisProgressProps) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [currentStep, setCurrentStep] = useState<string>("Initializing agent...");
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!runId || isCompleted) return;

    const eventSource = new EventSource(`/api/projects/${projectId}/events?runId=${runId}`);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        
        setEvents((prev) => [...prev, parsed]);

        if (parsed.type === "agent.thinking" && parsed.data?.step) {
          setCurrentStep(parsed.data.step);
        }

        if (parsed.type === "agent.completed") {
          setIsCompleted(true);
          setCurrentStep("Analysis complete!");
          eventSource.close();
          onComplete();
        }
        
        if (parsed.type === "agent.error") {
          setIsCompleted(true);
          setCurrentStep(`Error: ${parsed.data?.error || "Unknown error"}`);
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error:", err);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [projectId, runId, isCompleted, onComplete]);

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-xl">
      <div className="flex items-center gap-3">
        {isCompleted ? (
          <CheckCircle className="w-5 h-5 text-emerald-500" />
        ) : (
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
        )}
        <h3 className="text-sm font-semibold text-white flex-1">{currentStep}</h3>
      </div>
      
      <div className="bg-slate-950 p-4 rounded-lg border border-slate-900 h-48 overflow-y-auto font-mono text-xs text-slate-400 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-slate-500 mb-2 border-b border-slate-800 pb-2">
          <Terminal className="w-3.5 h-3.5" /> AI Engine Logs
        </div>
        {events.map((ev, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
            <span className="text-indigo-400">{ev.type}</span>
            <span className="text-slate-300">
              {ev.data?.step || (ev.type === "agent.completed" ? "Agent finished task" : "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

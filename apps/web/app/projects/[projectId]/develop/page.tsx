"use client";

import { use, useEffect, useState } from "react";
import { ChatPanel } from "@/components/ai-chat/chat-panel";
import { TaskList } from "@/components/ai/task-list";
import { ActivityStream } from "@/components/ai/activity-stream";
import { ChangeSetViewer } from "@/components/ai/change-set-viewer";
import { Play, Bug, CheckCircle } from "lucide-react";

export default function DevelopPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const [tasks, setTasks] = useState([]);
  const [changeSets, setChangeSets] = useState([]);
  const [isBuilding, setIsBuilding] = useState(false);
  
  useEffect(() => {
      fetchData();
      const interval = setInterval(fetchData, 5000); // Polling for updates
      return () => clearInterval(interval);
  }, [projectId]);

  const fetchData = async () => {
      try {
          const [tRes, cRes] = await Promise.all([
              fetch(`/api/projects/${projectId}/tasks`),
              fetch(`/api/projects/${projectId}/change-sets`)
          ]);
          
          if (tRes.ok) setTasks((await tRes.json()).tasks);
          if (cRes.ok) setChangeSets((await cRes.json()).changeSets);
      } catch (e) {
          console.error(e);
      }
  };

  const handleStartDevelopment = async () => {
      await fetch(`/api/projects/${projectId}/tasks`, { method: "POST" });
      fetchData();
  };

  const handleRunTests = async () => {
      setIsBuilding(true);
      try {
          await fetch(`/api/projects/${projectId}/test`, { method: "POST" });
      } finally {
          setIsBuilding(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
          
          {/* Left Column: Chat & Stream */}
          <div className="col-span-12 lg:col-span-4 h-[calc(100vh-8rem)] flex flex-col gap-6">
              <div className="flex-1">
                  <ChatPanel projectId={projectId} />
              </div>
              <div className="h-64 shrink-0">
                  <ActivityStream projectId={projectId} />
              </div>
          </div>

          {/* Right Column: Tasks & ChangeSets */}
          <div className="col-span-12 lg:col-span-8 space-y-8 overflow-y-auto h-[calc(100vh-8rem)] pr-4">
              
              {/* Header Actions */}
              <div className="flex justify-between items-center bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                  <div>
                      <h1 className="text-2xl font-bold text-white mb-2">Development Hub</h1>
                      <p className="text-slate-400 text-sm">Monitor AI execution, test code, and manage rollbacks.</p>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={handleStartDevelopment} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-2">
                          <Play className="w-4 h-4" /> Start Agent
                      </button>
                      <button onClick={handleRunTests} disabled={isBuilding} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                          <Bug className="w-4 h-4 text-emerald-400" /> Run Tests
                      </button>
                  </div>
              </div>

              {/* Task Plan */}
              <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-indigo-400" /> Execution Plan
                  </h2>
                  <TaskList tasks={tasks} />
              </div>

              {/* Change Sets */}
              <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <History className="w-5 h-5 text-emerald-400" /> History & Rollbacks
                  </h2>
                  <ChangeSetViewer projectId={projectId} changeSets={changeSets} />
              </div>

          </div>
      </div>
    </div>
  );
}

// Ensure the icon used exists
import { History } from "lucide-react";

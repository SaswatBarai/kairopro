"use client";

import { Layers, Box, Database, Cloud } from "lucide-react";

export function TechStackSummary({ stack, integrations }: { stack: any, integrations: any }) {
  if (!stack) return <div className="text-slate-500">No tech stack data available.</div>;

  const categories = [
    { title: "Frontend", icon: <Layers className="text-pink-400" />, data: stack.frontend },
    { title: "Backend", icon: <Box className="text-emerald-400" />, data: stack.backend },
    { title: "AI Engine", icon: <Box className="text-indigo-400" />, data: stack.aiEngine },
    { title: "Infrastructure", icon: <Cloud className="text-sky-400" />, data: stack.infrastructure },
    { title: "Database", icon: <Database className="text-amber-400" />, data: stack.database },
    { title: "Integrations", icon: <Layers className="text-fuchsia-400" />, data: integrations },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((cat) => (
        cat.data && (
          <div key={cat.title} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                {cat.icon}
              </div>
              <h3 className="font-bold text-slate-200">{cat.title}</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(cat.data).map(([key, value]) => (
                <div key={key}>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{key}</div>
                  <div className="text-sm text-slate-300 font-medium break-words">
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
}

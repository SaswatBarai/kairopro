"use client";

import { useState } from "react";
import { TechStackSummary } from "./tech-stack-summary";
import { ApiRoutesList } from "./api-routes-list";
import { DbSchemaViewer } from "./db-schema-viewer";

export function ArchitectureViewer({ spec }: { spec: any }) {
  const [activeTab, setActiveTab] = useState("tech");

  const tabs = [
    { id: "tech", label: "Tech Stack" },
    { id: "api", label: "API Routes" },
    { id: "db", label: "Database" },
    { id: "raw", label: "Raw JSON" },
  ];

  if (!spec) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "tech" && <TechStackSummary stack={spec.techStack} integrations={spec.integrations} />}
        {activeTab === "api" && <ApiRoutesList apiRoutes={spec.backend?.apiRoutes} frontendPages={spec.frontend?.pages} />}
        {activeTab === "db" && <DbSchemaViewer dbSpec={spec.database} />}
        {activeTab === "raw" && (
          <pre className="text-xs text-indigo-300 font-mono bg-slate-900 p-6 rounded-xl overflow-x-auto border border-slate-800">
            {JSON.stringify(spec, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

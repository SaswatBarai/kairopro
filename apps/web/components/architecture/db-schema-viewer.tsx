"use client";

import { Database } from "lucide-react";

export function DbSchemaViewer({ dbSpec }: { dbSpec: any }) {
  if (!dbSpec) return null;

  return (
    <div className="max-w-3xl">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
        <Database className="w-5 h-5 text-amber-400" /> Database Architecture
      </h3>
      
      <div className="space-y-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h4 className="font-semibold text-slate-200 mb-4">Prisma Models</h4>
          <div className="flex flex-wrap gap-2">
            {dbSpec.prismaModels?.map((model: string, i: number) => (
              <span key={i} className="px-3 py-1.5 bg-indigo-900/30 text-indigo-300 border border-indigo-800/50 rounded-lg text-sm font-medium">
                {model}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h4 className="font-semibold text-slate-200 mb-4">Relationships</h4>
          <ul className="space-y-3">
            {dbSpec.relationships?.map((rel: string, i: number) => (
              <li key={i} className="flex items-center gap-3 text-sm text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {rel}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

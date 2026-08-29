"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, Loader2 } from "lucide-react";
import { getPRDVersions } from "@/lib/prd";

export function VersionHistory({ projectId, onRestore }: { projectId: string, onRestore: (versionId: string) => void }) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersions();
  }, [projectId]);

  const fetchVersions = async () => {
    try {
      const data = await getPRDVersions(projectId);
      setVersions(data.versions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-500" /></div>;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-6">
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center gap-2 font-semibold text-slate-200">
        <History className="w-4 h-4 text-indigo-400" /> Version History
      </div>
      <div className="divide-y divide-slate-800 max-h-60 overflow-y-auto">
        {versions.length === 0 && <div className="p-4 text-xs text-slate-500">No previous versions.</div>}
        {versions.map((v) => (
          <div key={v.id} className="p-4 flex justify-between items-center hover:bg-slate-800/50 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-300">Version {v.version}</p>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(v.createdAt).toLocaleString()} • {v.generatedBy}
              </p>
            </div>
            <button
              onClick={() => onRestore(v.id)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-medium"
              title="Restore this version"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

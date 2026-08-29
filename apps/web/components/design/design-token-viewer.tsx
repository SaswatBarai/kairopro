"use client";

export function DesignTokenViewer({ spec }: { spec: any }) {
  if (!spec) return null;

  return (
    <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
      <h3 className="text-lg font-bold text-white mb-4">Design Tokens</h3>
      
      <div className="space-y-6">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Colors</div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(spec.colors || {}).filter(([k,v]) => typeof v === 'string').map(([key, val]) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md shadow-inner border border-white/10" style={{ backgroundColor: val as string }} />
                <div>
                  <div className="text-sm text-slate-300 capitalize">{key}</div>
                  <div className="text-xs text-slate-500">{val as string}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Typography</div>
          <div className="text-sm text-slate-300 p-3 bg-slate-950 rounded-lg font-mono border border-slate-800">
            Font: {spec.typography?.fontFamily || "Inter"}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Border Radius</div>
          <div className="flex gap-4">
            {Object.entries(spec.borderRadius || {}).map(([key, val]) => (
              <div key={key} className="text-center flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2">
                <div className="text-xs text-slate-500 mb-1">{key}</div>
                <div className="text-sm text-slate-300 font-mono">{val as string}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

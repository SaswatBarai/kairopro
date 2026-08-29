"use client";

import { useEffect, useState } from "react";
import { Loader2, Palette, CheckCircle, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { DesignPreview } from "@/components/design/design-preview";
import { DesignTokenViewer } from "@/components/design/design-token-viewer";
import { ReferenceUpload } from "@/components/design/reference-upload";

export default function DesignPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();

  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(1);

  useEffect(() => {
    fetchDesigns();
  }, [projectId]);

  const fetchDesigns = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/design`);
      if (res.ok) {
        const data = await res.json();
        setDesigns(data.designs || []);
        if (data.designs && data.designs.length > 0) {
            setActiveTab(data.designs[0].designOption);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
        const res = await fetch(`/api/projects/${projectId}/design`, { method: "POST" });
        if (res.ok) {
            // Wait a bit, then fetch (in a real app, listen to SSE)
            setTimeout(() => {
                fetchDesigns();
                setIsGenerating(false);
            }, 10000); // 10s wait for simulation, actual is SSE driven
        } else {
            setIsGenerating(false);
        }
    } catch {
        setIsGenerating(false);
    }
  };

  const handleApprove = async (designId: string) => {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/design/${designId}/approve`, { method: "POST" });
      if (res.ok) {
        router.push(`/projects/${projectId}/architecture`);
      }
    } finally {
      setIsApproving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  if (designs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center bg-slate-900/40 rounded-3xl border border-slate-800/50 backdrop-blur-md">
        <div className="bg-slate-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Palette className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">No Design System Generated</h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">Generate 3 premium design systems based on your approved PRD. You can then preview and select the one that fits best.</p>
        
        <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-900/30 flex items-center gap-3 mx-auto transition-all disabled:opacity-50"
        >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            {isGenerating ? "AI is Designing..." : "Generate Design Systems"}
        </button>
      </div>
    );
  }

  const activeDesign = designs.find(d => d.designOption === activeTab);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Palette className="w-6 h-6 text-indigo-400" />
            Design System Explorer
          </h1>
          <p className="text-sm text-slate-400 mt-1">Select the best aesthetic for your platform</p>
        </div>
      </div>

      <div className="flex gap-4 p-2 bg-slate-900/40 rounded-xl overflow-x-auto border border-slate-800/50">
          {designs.slice(0, 3).map((d) => (
              <button
                  key={d.id}
                  onClick={() => setActiveTab(d.designOption)}
                  className={`flex-1 py-4 px-6 rounded-lg text-left transition-all ${
                      activeTab === d.designOption 
                      ? "bg-indigo-600/20 border-indigo-500/50 text-white shadow-[0_0_20px_rgba(79,70,229,0.15)]" 
                      : "bg-slate-800/30 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  } border`}
              >
                  <h3 className="font-bold">{d.name}</h3>
                  <p className="text-xs mt-1 opacity-70 line-clamp-1">{d.description}</p>
              </button>
          ))}
      </div>

      {activeDesign && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                  <DesignPreview designSpec={activeDesign.designSpec} />
              </div>
              <div className="space-y-6">
                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                      <h3 className="text-lg font-bold text-white mb-2">{activeDesign.name}</h3>
                      <p className="text-sm text-slate-400 mb-6">{activeDesign.description}</p>
                      <button
                          onClick={() => handleApprove(activeDesign.id)}
                          disabled={isApproving}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/20 flex justify-center items-center gap-2 transition-all disabled:opacity-50"
                      >
                          {isApproving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                          Approve {activeDesign.name}
                      </button>
                  </div>
                  <DesignTokenViewer spec={activeDesign.designSpec} />
                  <ReferenceUpload 
                      projectId={projectId} 
                      onUploadComplete={() => {
                          console.log("References uploaded");
                          // AI will use these on next generation
                      }} 
                  />
              </div>
          </div>
      )}
    </div>
  );
}

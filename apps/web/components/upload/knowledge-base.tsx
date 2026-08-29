"use client";

import { useState, useEffect } from "react";
import { FileUploadZone } from "./file-upload-zone";
import { DocumentData, SearchResult } from "@kairopro/types";
import { Search, FileText, Database, Loader2, Sparkles } from "lucide-react";

interface KnowledgeBaseProps {
  projectId: string;
}

export function KnowledgeBaseManager({ projectId }: KnowledgeBaseProps) {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchDocuments();
    // Poll for status updates every 3s
    const interval = setInterval(fetchDocuments, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/knowledge/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-white">Ask your Knowledge Base</h2>
        </div>
        
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="E.g. What is the main objective of this project?"
            className="w-full pl-12 pr-24 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <button
            type="submit"
            disabled={isSearching || !searchQuery}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Results</h3>
            <div className="space-y-3">
              {searchResults.map((result, i) => (
                <div key={i} className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <p className="text-sm text-slate-300 leading-relaxed mb-3">"{result.content}"</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-indigo-950/50 text-indigo-400 rounded-md border border-indigo-900/50">
                      <FileText className="w-3.5 h-3.5" /> {result.documentFilename}
                    </span>
                    <span className="text-slate-500">Relevance: {(result.score * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Zone */}
        <FileUploadZone projectId={projectId} onUploadComplete={fetchDocuments} />

        {/* Document List */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Project Documents</h2>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {loadingDocs ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-600" /></div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">No documents uploaded yet.</div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-medium text-slate-200 truncate">{doc.originalFilename}</p>
                      <p className="text-xs text-slate-500">{(Number(doc.fileSize) / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  
                  <div>
                    {doc.processingStatus === "completed" && (
                      <span className="px-2 py-1 bg-emerald-950/60 text-emerald-400 text-[10px] font-bold rounded-md border border-emerald-900/60">
                        Indexed
                      </span>
                    )}
                    {doc.processingStatus === "processing" && (
                      <span className="px-2 py-1 bg-indigo-950/60 text-indigo-400 text-[10px] font-bold rounded-md border border-indigo-900/60 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Processing
                      </span>
                    )}
                    {doc.processingStatus === "pending" && (
                      <span className="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-md border border-slate-700">
                        Queued
                      </span>
                    )}
                    {doc.processingStatus === "failed" && (
                      <span className="px-2 py-1 bg-red-950/60 text-red-400 text-[10px] font-bold rounded-md border border-red-900/60">
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

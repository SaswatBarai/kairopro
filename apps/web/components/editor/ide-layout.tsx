"use client";

import { useState, useEffect } from "react";
import { MonacoEditor } from "./monaco-editor";
import { FileTree } from "./file-tree";
import { XtermTerminal } from "../terminal/xterm-terminal";
import { fetchFiles, getSandboxStatus, createSandbox } from "@/lib/workspace";
import { Loader2, Play, TerminalSquare, Laptop } from "lucide-react";

export function IdeLayout({ projectId }: { projectId: string }) {
  const [isSandboxReady, setIsSandboxReady] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [files, setFiles] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");

  useEffect(() => {
    initSandbox();
  }, [projectId]);

  const initSandbox = async () => {
    try {
      let status = await getSandboxStatus(projectId);
      if (!status.workspace || status.workspace.status !== "running") {
          await createSandbox(projectId);
          // poll until running
          let ready = false;
          while (!ready) {
              await new Promise(r => setTimeout(r, 2000));
              status = await getSandboxStatus(projectId);
              if (status.workspace?.status === "running") ready = true;
          }
      }
      setIsSandboxReady(true);
      loadFiles();
    } catch (e) {
      console.error(e);
    } finally {
      setIsStarting(false);
    }
  };

  const loadFiles = async () => {
    try {
      const data = await fetchFiles(projectId);
      setFiles(data.files || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileSelect = async (path: string) => {
    setActiveFile(path);
    try {
      const content = await fetchFiles(projectId, path);
      setFileContent(content);
    } catch (e) {
      console.error("Failed to load file content", e);
    }
  };

  if (isStarting) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
            Provisioning Sandbox Container...
        </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* File Tree */}
      <div className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
            Explorer
            <button onClick={loadFiles} className="hover:text-white transition-colors">↻</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
            <FileTree files={files} activeFile={activeFile} onSelect={handleFileSelect} />
        </div>
      </div>

      {/* Editor & Terminal */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 relative flex">
            {activeFile ? (
                <MonacoEditor 
                    projectId={projectId} 
                    path={activeFile} 
                    initialContent={fileContent} 
                />
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                    Select a file to edit
                </div>
            )}
        </div>
        
        {/* Terminal Panel */}
        <div className="h-64 border-t border-slate-800 bg-black flex flex-col shrink-0">
            <div className="flex items-center px-4 py-2 border-b border-slate-800 bg-slate-900/50 text-xs text-slate-400 gap-4">
                <button className="flex items-center gap-1.5 text-white"><TerminalSquare className="w-3.5 h-3.5"/> Terminal</button>
                <button className="flex items-center gap-1.5 hover:text-white transition-colors"><Laptop className="w-3.5 h-3.5"/> Output</button>
            </div>
            <div className="flex-1 relative">
                <XtermTerminal projectId={projectId} />
            </div>
        </div>
      </div>

      {/* Live Preview Panel */}
      <div className="w-96 border-l border-slate-800 bg-slate-900/30 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-emerald-400" /> Live Preview
            </div>
            <a href={`http://${projectId}.preview.localhost:3000`} target="_blank" className="text-xs text-indigo-400 hover:underline">
                Open Ext
            </a>
        </div>
        <div className="flex-1 bg-white">
            <iframe 
                src={`http://${projectId}.preview.localhost:3000`} 
                className="w-full h-full border-0 bg-slate-100"
                title="Preview"
            />
        </div>
      </div>
    </div>
  );
}

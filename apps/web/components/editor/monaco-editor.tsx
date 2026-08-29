"use client";

import { useRef, useEffect, useState } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { saveFile } from "@/lib/workspace";

export function MonacoEditor({ projectId, path, initialContent }: { projectId: string, path: string, initialContent: string }) {
  const monaco = useMonaco();
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent, path]);

  // Command-S to save
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        await handleSave(content);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, projectId, path]);

  const handleSave = async (value: string) => {
    setIsSaving(true);
    try {
      await saveFile(projectId, path, value);
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  const getLanguage = (p: string) => {
      if (p.endsWith('.ts') || p.endsWith('.tsx')) return 'typescript';
      if (p.endsWith('.js') || p.endsWith('.jsx')) return 'javascript';
      if (p.endsWith('.py')) return 'python';
      if (p.endsWith('.json')) return 'json';
      if (p.endsWith('.html')) return 'html';
      if (p.endsWith('.css')) return 'css';
      return 'plaintext';
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-300">{path}</span>
            {isSaving && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
        </div>
      </div>
      <div className="flex-1 bg-[#1e1e1e]">
        <Editor
            height="100%"
            language={getLanguage(path)}
            theme="vs-dark"
            value={content}
            onChange={(val) => setContent(val || "")}
            options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                wordWrap: "on",
                padding: { top: 16 }
            }}
            onMount={(editor) => { editorRef.current = editor; }}
        />
      </div>
    </div>
  );
}

"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";

import { PRDToolbar } from "./prd-toolbar";
import { PRDSidebar } from "./prd-sidebar";
import { AIEditPanel } from "./ai-edit-panel";

interface PRDEditorProps {
  projectId: string;
  initialContent: string;
  onUpdate: (content: string) => void;
  readOnly?: boolean;
}

export function PRDEditor({ projectId, initialContent, onUpdate, readOnly = false }: PRDEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start typing your Product Requirements Document...",
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-indigo max-w-none focus:outline-none min-h-[500px] p-8",
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
  });

  if (!isMounted) {
    return <div className="h-[500px] animate-pulse bg-slate-900/50 rounded-xl border border-slate-800" />;
  }

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex relative">
      <PRDSidebar editor={editor} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <PRDToolbar editor={editor!} />
        <div className="overflow-y-auto max-h-[70vh]">
          <EditorContent editor={editor} />
        </div>
      </div>

      <AIEditPanel editor={editor} projectId={projectId} />
    </div>
  );
}

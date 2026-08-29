"use client";

import { Editor } from "@tiptap/react";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Code } from "lucide-react";

export function PRDToolbar({ editor }: { editor: Editor }) {
  if (!editor) return null;

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-2 flex gap-1 sticky top-0 z-10">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        icon={<Heading1 className="w-4 h-4" />}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        icon={<Heading2 className="w-4 h-4" />}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        icon={<Heading3 className="w-4 h-4" />}
      />
      
      <div className="w-px h-6 bg-slate-700 mx-2 self-center" />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        icon={<Bold className="w-4 h-4" />}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        icon={<Italic className="w-4 h-4" />}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        icon={<Code className="w-4 h-4" />}
      />
      
      <div className="w-px h-6 bg-slate-700 mx-2 self-center" />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        icon={<List className="w-4 h-4" />}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        icon={<ListOrdered className="w-4 h-4" />}
      />
    </div>
  );
}

function ToolbarButton({ onClick, isActive, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        isActive ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
      }`}
    >
      {icon}
    </button>
  );
}

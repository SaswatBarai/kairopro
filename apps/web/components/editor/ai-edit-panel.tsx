"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { editPRDSection } from "@/lib/prd";
import { Editor } from "@tiptap/react";

export function AIEditPanel({ editor, projectId }: { editor: Editor | null, projectId: string }) {
  const [prompt, setPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = async () => {
    if (!editor || !prompt.trim()) return;

    const { from, to } = editor.state.selection;
    const selectedContent = editor.state.doc.textBetween(from, to, "\n");
    
    // If no text is highlighted, we can't edit just a section easily in this MVP
    if (!selectedContent) {
      alert("Please highlight a section of text in the PRD to modify it with AI.");
      return;
    }

    setIsEditing(true);
    try {
      const res = await editPRDSection(projectId, selectedContent, prompt);
      
      if (res.updatedContent) {
        editor.chain().focus().deleteSelection().insertContent(res.updatedContent).run();
        setPrompt("");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to edit section.");
    } finally {
      setIsEditing(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="w-80 bg-indigo-950/20 border-l border-indigo-900/50 p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-4">
        <Sparkles className="w-4 h-4 text-indigo-400" /> Ask AI to Edit
      </div>
      
      <div className="text-xs text-indigo-200/60 mb-4 bg-indigo-900/20 p-3 rounded-lg">
        Highlight a section of text in the editor, then describe how you want to change it.
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="E.g. Make this section more concise, or add a new user story for password reset..."
        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 min-h-[120px] focus:outline-none focus:border-indigo-500 resize-none mb-3"
      />
      
      <button
        onClick={handleEdit}
        disabled={isEditing || !prompt.trim()}
        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex justify-center items-center gap-2 transition-all"
      >
        {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {isEditing ? "Editing..." : "Apply AI Edit"}
      </button>
    </div>
  );
}

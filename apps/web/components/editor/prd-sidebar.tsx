"use client";

import { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { ListTree } from "lucide-react";

export function PRDSidebar({ editor }: { editor: Editor | null }) {
  const [headings, setHeadings] = useState<{ level: number; text: string; id: string }[]>([]);

  useEffect(() => {
    if (!editor) return;

    const updateHeadings = () => {
      const items: any[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          items.push({
            level: node.attrs.level,
            text: node.textContent,
            id: `heading-${pos}`,
          });
        }
      });
      setHeadings(items);
    };

    editor.on('update', updateHeadings);
    updateHeadings(); // Initial run

    return () => {
      editor.off('update', updateHeadings);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 h-full flex flex-col hidden lg:flex">
      <div className="flex items-center gap-2 text-slate-300 font-semibold mb-6">
        <ListTree className="w-4 h-4 text-indigo-400" /> Document Outline
      </div>
      <div className="space-y-1 overflow-y-auto">
        {headings.length === 0 && <span className="text-xs text-slate-500">No headings yet.</span>}
        {headings.map((heading) => (
          <div
            key={heading.id}
            className={`text-sm truncate cursor-pointer text-slate-400 hover:text-indigo-400 transition-colors ${
              heading.level === 1 ? 'font-semibold mt-2' : heading.level === 2 ? 'pl-4' : 'pl-8'
            }`}
            onClick={() => {
              // Basic scrolling - advanced TipTap would set an ID and scroll
            }}
          >
            {heading.text}
          </div>
        ))}
      </div>
    </div>
  );
}

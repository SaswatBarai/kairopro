"use client";

import { use } from "react";
import { IdeLayout } from "@/components/editor/ide-layout";

export default function CodeIdePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);

  return (
    <div className="h-screen w-full bg-slate-950 overflow-hidden flex flex-col pt-16">
      <IdeLayout projectId={projectId} />
    </div>
  );
}

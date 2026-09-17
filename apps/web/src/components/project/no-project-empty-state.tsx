"use client";

import { useRouter } from "next/navigation";
import { FolderPlus, ArrowRight, AlertCircle } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface NoProjectEmptyStateProps {
  stepName?: string;
}

export function NoProjectEmptyState({
  stepName = "this step",
}: NoProjectEmptyStateProps) {
  const router = useRouter();

  return (
    <FadeIn className="mx-auto flex w-full max-w-[600px] flex-col items-center justify-center px-4 py-16">
      <Card className="flex w-full flex-col items-center rounded-xl border-white/[0.08] bg-brand-surface p-8 text-center shadow-xl">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple-light">
          <FolderPlus className="h-7 w-7" />
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
          <span>Project Required</span>
        </div>

        <h2 className="mb-2 text-xl font-semibold tracking-tight text-zinc-100">
          You have not created a project yet
        </h2>

        <p className="mb-6 max-w-[440px] text-sm leading-relaxed text-zinc-400">
          Before accessing {stepName}, please create a project by describing
          your application requirements first.
        </p>

        <Button
          className="h-10 gap-2 px-6"
          type="button"
          onClick={() => router.push("/projects/new")}
        >
          <span>Create a Project</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Card>
    </FadeIn>
  );
}

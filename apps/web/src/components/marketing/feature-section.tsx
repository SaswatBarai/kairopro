import type { ReactNode } from "react";

import { FadeIn } from "@/components/landing/fade-in";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const accentText = {
  purple: "text-brand-purple-light",
  cyan: "text-brand-cyan",
  green: "text-brand-green",
} as const;

export type FeatureAccent = keyof typeof accentText;

export function FeatureSection({
  id,
  phase,
  name,
  tagline,
  title,
  description,
  tagsLabel,
  tags,
  accent = "purple",
  panel,
  reversed = false,
}: {
  id: string;
  phase: string;
  name: string;
  tagline: string;
  title: string;
  description: string;
  tagsLabel: string;
  tags: string[];
  accent?: FeatureAccent;
  panel: ReactNode;
  reversed?: boolean;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
      <FadeIn className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div
          className={cn(
            "flex flex-col gap-4 lg:col-span-5",
            reversed && "order-1 lg:order-2",
          )}
        >
          <div
            className={cn(
              "font-mono-tech text-xs font-semibold uppercase tracking-widest",
              accentText[accent],
            )}
          >
            {phase} // {name} — {tagline}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
          <div className="pt-2">
            <div className="mb-2 font-mono-tech text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              {tagsLabel}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  mono
                  className={cn("bg-brand-surface-muted", accentText[accent])}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className={cn("lg:col-span-7", reversed && "order-2 lg:order-1")}>
          {panel}
        </div>
      </FadeIn>
    </section>
  );
}

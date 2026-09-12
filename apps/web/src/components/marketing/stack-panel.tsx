import { Fragment } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stack = ["Next.js", "PostgreSQL", "Prisma", "Tailwind CSS", "TypeScript"];

export function StackPanel({ className }: { className?: string }) {
  return (
    <Card
      className={cn(
        "gap-0 rounded-lg border-white/[0.08] bg-brand-dark py-0",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Target Architecture Stack
        </span>
        <span className="font-mono-tech text-[11px] text-brand-green">
          Standards compliant
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-baseline sm:gap-3">
        <span className="shrink-0 font-mono-tech text-[11px] font-medium text-zinc-400">
          Built with:
        </span>
        <div className="flex flex-wrap items-center gap-1.5 font-mono-tech text-[11px]">
          {stack.map((tech, index) => (
            <Fragment key={tech}>
              {index > 0 && (
                <span aria-hidden="true" className="text-zinc-600">
                  /
                </span>
              )}
              <span className="rounded-[3px] bg-brand-surface-muted px-2 py-0.5 font-medium text-brand-purple-light">
                {tech}
              </span>
            </Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

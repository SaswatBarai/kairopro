import { Lock, RefreshCw, Rocket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const kanbanColumns = [
  {
    label: "TODO (3)",
    cards: [
      { text: "OAuth Flow", cls: "text-zinc-200" },
      { text: "Billing hook", cls: "text-zinc-200" },
    ],
  },
  {
    label: "IN PROGRESS (1)",
    cards: [
      {
        text: "Relational filters",
        cls: "border border-brand-cyan/30 text-brand-cyan",
      },
    ],
  },
  {
    label: "DONE (8)",
    cards: [{ text: "Prisma migration", cls: "text-zinc-500" }],
  },
];

export function StagingPanel() {
  return (
    <Card className="gap-0 overflow-hidden rounded-lg border-white/[0.08] bg-brand-surface py-0 shadow-2xl shadow-black/40">
      <CardHeader className="border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </div>
        <div className="flex w-72 items-center justify-between gap-2 rounded-[3px] bg-brand-dark px-3 py-1 font-mono-tech text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5 truncate">
            <Lock className="h-3 w-3 shrink-0 text-brand-green" />
            <span className="truncate text-brand-green">
              https://taskflow-a1b2.preview.kairopro.dev
            </span>
          </span>
          <RefreshCw className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 py-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-brand-purple text-[10px] font-bold text-white">
              TF
            </div>
            <span className="font-mono-tech text-xs font-semibold text-zinc-100">
              TaskFlow Workspace
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono-tech text-[10px] uppercase tracking-wide text-zinc-500">
            <span className="hidden sm:inline">Role: admin</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-surface-muted text-[9px] font-semibold text-zinc-200">
              JD
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {kanbanColumns.map((column) => (
            <div
              key={column.label}
              className="flex flex-col gap-1.5 rounded-[3px] bg-brand-surface-muted p-2"
            >
              <span className="font-mono-tech text-[10px] uppercase tracking-wide text-zinc-500">
                {column.label}
              </span>
              {column.cards.map((card) => (
                <div
                  key={card.text}
                  className={cn(
                    "rounded-[3px] bg-brand-dark p-1.5 font-mono-tech text-[11px]",
                    card.cls,
                  )}
                >
                  {card.text}
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3.5">
        <div className="flex items-center gap-1.5 font-mono-tech text-[10px] uppercase tracking-wide text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-brand-green" />
          Neon Postgres branch: ready
        </div>
        <Button size="sm" className="gap-1.5 rounded-[3px]">
          Deploy to Production
          <Rocket className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}

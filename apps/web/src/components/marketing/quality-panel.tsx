import { BadgeCheck, CheckCircle2, Wrench } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const testGroups = [
  { name: "Unit Tests: Reducer & State Logic", stat: "14 passed (310ms)" },
  {
    name: "Integration Endpoints: /api/v1/auth & /tasks",
    stat: "12 passed (680ms)",
  },
  {
    name: "E2E Playwright: Auth Session & Workspace Switcher",
    stat: "8 passed (850ms)",
  },
];

export function QualityPanel() {
  return (
    <Card className="gap-0 rounded-lg border-white/[0.08] bg-brand-surface py-0 shadow-2xl shadow-black/40">
      <CardContent className="flex flex-col gap-3 px-5 py-5">
        <div className="flex items-center justify-between rounded-[3px] border border-emerald-500/25 bg-brand-surface-muted px-3 py-2.5">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-brand-green" />
            <span className="font-mono-tech text-xs font-semibold text-zinc-100">
              34 / 34 tests passing
            </span>
          </div>
          <span className="font-mono-tech text-[11px] font-medium text-emerald-400">
            Execution: 1.84s
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {testGroups.map((group) => (
            <div
              key={group.name}
              className="flex items-center justify-between rounded-[3px] border border-white/[0.06] bg-brand-dark px-3 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-1.5 font-mono-tech text-xs font-medium text-zinc-100">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-green" />
                <span className="truncate">{group.name}</span>
              </span>
              <span className="ml-3 shrink-0 font-mono-tech text-[10px] uppercase tracking-wide text-zinc-500">
                {group.stat}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2.5 rounded-[3px] bg-brand-surface-muted px-3 py-2.5 font-mono-tech text-[11px] text-zinc-400">
          <Wrench className="h-4 w-4 shrink-0 text-brand-purple-light" />
          <span>
            Self-healing AST repaired 1 null pointer exception during test cycle
            01 automatically.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

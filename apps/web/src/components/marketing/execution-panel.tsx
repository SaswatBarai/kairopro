import { Check } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const completedSteps = [
  { label: "Parsing PRD AST", time: "0.4s" },
  { label: "Generating Scaffold & App Routes", time: "1.2s" },
  { label: "PostgreSQL Schema Migration", time: "2.8s" },
];

const terminalLines = [
  { time: "14:02:11", text: "pnpm build:app", tone: "cmd" },
  { time: "14:02:12", text: "▲ Next.js 14.2.15 (Turbopack)", tone: "dim" },
  { time: "14:02:12", text: "  - Environments: .env.production", tone: "dim" },
  { time: "14:02:13", text: "✓ Compiled in 910ms (142 modules)", tone: "ok" },
  { time: "14:02:14", text: "✓ Route (app) /api/tasks: 120ms", tone: "route" },
] as const;

const toneClass = {
  cmd: "text-zinc-200",
  dim: "text-zinc-500",
  ok: "text-zinc-300",
  route: "text-brand-green",
} as const;

export function ExecutionPanel() {
  return (
    <Card className="gap-0 rounded-lg border-white/[0.08] bg-brand-surface py-0 shadow-2xl shadow-black/40">
      <CardContent className="flex flex-col gap-4 px-5 py-5">
        <div className="flex flex-col gap-2">
          {completedSteps.map((step) => (
            <div
              key={step.label}
              className="flex items-center justify-between font-mono-tech text-xs text-zinc-100"
            >
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand-green" />
                {step.label}
              </span>
              <span className="text-zinc-500">{step.time}</span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-[3px] border border-brand-cyan/30 bg-brand-cyan/5 px-2 py-1.5 font-mono-tech text-xs text-brand-cyan">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse-cyan rounded-full bg-brand-cyan" />
              Running Integration Tests &amp; Edge Build
            </span>
            <span className="font-semibold">Executing (3.1s)</span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-1 rounded-md border border-white/[0.08] bg-brand-dark p-4 font-mono-tech text-[11px]">
          <div className="mb-1 flex items-center justify-between font-mono-tech text-[10px] uppercase tracking-wide text-zinc-500">
            <span>Sandbox terminal — tty1</span>
            <span>PID 41088</span>
          </div>
          {terminalLines.map((line) => (
            <div key={line.time + line.text} className={toneClass[line.tone]}>
              <span className="text-zinc-600">{line.time}</span>{" "}
              {line.tone === "cmd" && (
                <span className="text-brand-purple-light">$ </span>
              )}
              {line.text}
            </div>
          ))}
          <div className="flex items-center gap-1 text-brand-cyan">
            <span className="text-zinc-600">14:02:14</span>
            <span>[agent:ast-checker] verifying type cohesion</span>
            <span className="ml-1 inline-block h-3.5 w-2 animate-pulse bg-brand-cyan" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

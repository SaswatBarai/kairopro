import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Step 1", name: "PRD Synthesized", state: "done" },
  { label: "Step 2 (Active)", name: "Data Model", state: "active" },
  { label: "Step 3", name: "App Router Map", state: "pending" },
] as const;

const schemaLines = [
  { n: "01", code: "model Task {", cls: "text-[#C5C0FF]" },
  {
    n: "02",
    code: "  id          String    @id @default(cuid())",
    cls: "text-zinc-400",
  },
  { n: "03", code: "  title       String", cls: "text-zinc-400" },
  {
    n: "04",
    code: "  status      TaskStatus @default(PENDING)",
    cls: "text-zinc-400",
  },
  { n: "05", code: "  teamId      String", cls: "text-zinc-400" },
  {
    n: "06",
    code: "  team        Team      @relation(fields: [teamId],",
    cls: "text-brand-cyan",
  },
  {
    n: "07",
    code: "                        references: [id], onDelete: Cascade)",
    cls: "text-brand-cyan",
  },
  { n: "08", code: "  assigneeId  String?", cls: "text-zinc-400" },
  {
    n: "09",
    code: "  createdAt   DateTime  @default(now())",
    cls: "text-zinc-400",
  },
  { n: "10", code: "}", cls: "text-[#C5C0FF]" },
];

export function VerificationPanel() {
  return (
    <Card className="gap-0 rounded-lg border-white/[0.08] bg-brand-surface py-0 shadow-2xl shadow-black/40">
      <CardContent className="flex flex-col gap-4 px-5 py-5">
        <div className="grid grid-cols-3 gap-2">
          {steps.map((step) => (
            <div
              key={step.label}
              className={cn(
                "flex items-center gap-2 rounded-[3px] p-2",
                step.state === "active"
                  ? "border border-brand-purple/50 bg-brand-surface-muted"
                  : "bg-brand-surface-muted",
                step.state === "pending" && "opacity-60",
              )}
            >
              {step.state === "done" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-green" />
              ) : (
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    step.state === "active"
                      ? "animate-pulse-cyan bg-brand-purple"
                      : "bg-zinc-600",
                  )}
                />
              )}
              <div className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    "font-mono-tech text-[9px] uppercase tracking-wider",
                    step.state === "active"
                      ? "text-brand-purple-light"
                      : "text-zinc-500",
                  )}
                >
                  {step.label}
                </span>
                <span className="truncate font-mono-tech text-[11px] font-medium text-zinc-100">
                  {step.name}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 rounded-md border border-white/[0.08] bg-brand-dark p-4 font-mono-tech text-[11px] leading-relaxed">
          <div className="mb-2 flex items-center justify-between border-b border-white/[0.06] pb-2 font-mono-tech text-[10px] uppercase tracking-wide text-zinc-500">
            <span>prisma/schema.prisma</span>
            <span className="text-brand-green">Validated syntax</span>
          </div>
          {schemaLines.map((line) => (
            <div key={line.n} className={line.cls}>
              <span className="text-zinc-600">{line.n}</span> {line.code}
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3.5">
        <span className="font-mono-tech text-[10px] uppercase tracking-wide text-zinc-500">
          Foreign keys: 4 · Indices: 2 resolved
        </span>
        <Button size="sm" className="gap-1.5 rounded-[3px]">
          Approve and continue
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}

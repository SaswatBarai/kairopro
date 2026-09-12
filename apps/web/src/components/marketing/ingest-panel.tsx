import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const presets = ["Task manager", "CRM Multi-tenant", "API Gateway"];

export function IngestPanel() {
  return (
    <Card className="gap-0 rounded-lg border-white/[0.08] bg-brand-surface py-0 shadow-2xl shadow-black/40">
      <CardHeader className="border-b border-white/[0.06] px-5 py-3">
        <CardTitle className="font-mono-tech text-[11px] text-zinc-400">
          ingest://workspace/spec-import
        </CardTitle>
        <CardAction>
          <Badge variant="green" mono>
            Ready for parse
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 py-5">
        <div className="flex flex-col gap-2">
          <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Product specification prompt
          </span>
          <div className="w-full rounded-md border border-white/[0.08] bg-brand-dark p-4 font-mono-tech text-xs leading-relaxed text-zinc-200">
            <p>
              A collaborative task management system with workspace isolation,
              RBAC permissions, and nested subtasks. Requires audit logging and
              team billing webhooks.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
              <span className="font-mono-tech text-[10px] uppercase tracking-wide text-zinc-500">
                189 tokens · parser ready
              </span>
              <span className="font-mono-tech text-[11px] text-brand-purple-light">
                Target: Next.js 14 App Router + Prisma
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 rounded-md border-2 border-dashed border-white/[0.15] bg-white/[0.02] p-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-brand-purple/15 text-brand-purple-light">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono-tech text-xs font-medium text-zinc-100">
                product-requirements.pdf
              </span>
              <span className="font-mono-tech text-[10px] text-zinc-500">
                482 KB · Synthesized from Notion spec
              </span>
            </div>
          </div>
          <Badge variant="green" mono>
            Attached &amp; indexed
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="font-mono-tech text-[10px] uppercase tracking-wide text-zinc-500">
            Quick schemas:
          </span>
          {presets.map((preset) => (
            <Button
              key={preset}
              size="xs"
              variant="secondary"
              className="rounded-[3px] font-mono-tech text-[11px] text-zinc-300"
            >
              {preset}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

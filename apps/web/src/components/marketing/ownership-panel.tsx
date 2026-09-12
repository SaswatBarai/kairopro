import { GitFork } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const commits = [
  {
    message: "feat(db): initialize prisma schema and rbac migrations",
    hash: "1a9c3e2",
  },
  {
    message: "feat(app): configure nextjs 14 app router scaffold",
    hash: "4b8d7f1",
  },
  { message: "test(e2e): add playwright auth test suites", hash: "9f0e21a" },
];

export function OwnershipPanel() {
  return (
    <Card className="gap-0 rounded-lg border-white/[0.08] bg-brand-surface py-0 shadow-2xl shadow-black/40">
      <CardHeader className="border-b border-white/[0.06] px-5 py-3">
        <CardTitle className="flex items-center gap-2 font-mono-tech text-xs font-semibold text-zinc-100">
          <GitFork className="h-4 w-4 text-zinc-400" />
          Export to GitHub
        </CardTitle>
        <CardAction>
          <Badge variant="purple" mono>
            Sync configured
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="px-5 py-5">
        <div className="flex flex-col gap-3 rounded-md border border-white/[0.06] bg-brand-dark p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono-tech text-xs font-medium text-zinc-100">
                adalovelace/taskflow
              </span>
              <Badge variant="outline" mono className="text-zinc-400">
                Private
              </Badge>
            </div>
            <span className="flex items-center gap-1.5 font-mono-tech text-[11px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
              main (synced)
            </span>
          </div>

          <Separator className="bg-white/[0.06]" />

          <div className="flex flex-col gap-1.5 font-mono-tech text-[11px]">
            {commits.map((commit) => (
              <div
                key={commit.hash}
                className="flex items-center justify-between gap-3"
              >
                <span className="truncate text-zinc-200">{commit.message}</span>
                <span className="shrink-0 font-mono-tech text-[10px] uppercase text-zinc-600">
                  {commit.hash}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3.5">
        <span className="font-mono-tech text-[10px] uppercase tracking-wide text-zinc-500">
          Zero proprietary runtimes included
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" className="rounded-[3px]">
            Download ZIP
          </Button>
          <Button size="sm" className="rounded-[3px]">
            Push to GitHub
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

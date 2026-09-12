import { Fragment } from "react";
import { Check, Terminal } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Unlimited projects",
    description:
      "Orchestrate concurrent development workspaces without volume constraints.",
  },
  {
    title: "Live preview environments",
    description:
      "Automated ephemeral sandboxes configured dynamically per microservice.",
  },
  {
    title: "Unlimited AI generations",
    description:
      "Full context tokens and autonomous multi-file agent execution cycles.",
  },
  {
    title: "One-click deploy",
    description:
      "Production-grade edge runtime distribution with TLS routing pre-wired.",
  },
  {
    title: "Full-stack code generation",
    description:
      "Strict typed schemas, relational persistence, and stateful endpoints.",
  },
  {
    title: "GitHub export",
    description:
      "Native upstream Git sync. No proprietary locks, purely clean TypeScript.",
  },
];

const reassurance = [
  {
    label: "Infrastructure",
    value: "Ephemeral sandboxes included",
    accent: false,
  },
  {
    label: "Ownership",
    value: "Full MIT / proprietary code export",
    accent: false,
  },
  {
    label: "Limits",
    value: "None applied during preview period",
    accent: true,
  },
];

export function InclusionPanel() {
  return (
    <FadeIn className="mt-12 w-full">
      <Card className="gap-0 overflow-hidden rounded-lg border-white/[0.08] bg-brand-surface py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-white/[0.06] bg-brand-surface-muted px-5 py-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-[15px] font-medium text-zinc-100">
            <Terminal className="h-4 w-4 text-brand-purple-light" />
            Everything unlocked during beta
          </CardTitle>
          <CardAction className="self-center">
            <Badge
              className="gap-1.5 border-white/[0.08] bg-brand-dark px-2.5 py-1 font-mono-tech text-[10px] tracking-wider text-zinc-400"
              variant="outline"
            >
              <span className="h-1 w-1 rounded-full bg-brand-cyan" />
              100% free · No payment required
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-x-8 gap-y-5 bg-brand-dark/50 px-5 py-6 md:grid-cols-2 md:px-6">
          {features.map((feature) => (
            <div key={feature.title} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border border-brand-purple/40 bg-brand-purple/15">
                <Check className="h-3 w-3 text-brand-purple-light" />
              </div>
              <div>
                <div className="text-sm font-medium leading-5 text-zinc-100">
                  {feature.title}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/[0.06] bg-[#131318] px-5 py-3 md:px-6">
          {reassurance.map((item, index) => (
            <Fragment key={item.label}>
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="hidden text-zinc-700 lg:inline"
                >
                  •
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
                  {item.label}:
                </span>
                <span
                  className={cn(
                    "font-mono-tech text-[11px]",
                    item.accent ? "text-brand-green" : "text-zinc-200",
                  )}
                >
                  {item.value}
                </span>
              </div>
            </Fragment>
          ))}
        </CardFooter>
      </Card>
    </FadeIn>
  );
}

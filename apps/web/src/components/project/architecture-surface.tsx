import { Check, FileText, Layers, Loader2, Zap } from "lucide-react";
import type { Spec } from "@kairopro/contracts";

import { FadeIn } from "@/components/landing/fade-in";
import type { AppStructureContent } from "@/lib/spec-content";
import { cn } from "@/lib/utils";

const METHOD_CLASSES: Record<string, string> = {
  GET: "border-white/[0.1] bg-white/[0.06] text-zinc-300",
  POST: "border-brand-purple/40 bg-brand-purple/20 text-brand-purple-light",
  PUT: "border-amber-400/40 bg-amber-400/20 text-amber-300",
  PATCH: "border-amber-400/40 bg-amber-400/20 text-amber-300",
  DELETE: "border-rose-400/40 bg-rose-400/20 text-rose-300",
};

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-brand-surface-muted">
      {children}
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: typeof FileText;
  title: string;
  badge: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.04] px-4 py-3">
      <div className="flex items-center gap-2.5">
        <Icon className="h-[15px] w-[15px] text-brand-purple-light" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">
          {title}
        </h3>
      </div>
      <span className="rounded-[3px] border border-white/[0.08] bg-white/[0.05] px-2 py-0.5 font-mono-tech text-[11px] text-zinc-300">
        {badge}
      </span>
    </div>
  );
}

interface ArchitectureSurfaceProps {
  spec: Spec | undefined;
  isLoading: boolean;
}

export function ArchitectureSurface({
  spec,
  isLoading,
}: ArchitectureSurfaceProps) {
  if (!spec) {
    return (
      <div className="flex min-h-[240px] w-full min-w-0 flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-white/[0.08] bg-brand-surface-muted p-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple-light" />
        <p className="text-sm text-zinc-400">
          {isLoading
            ? "Generating the app structure..."
            : "Waiting for the app structure to be generated."}
        </p>
      </div>
    );
  }

  const content = spec.content as unknown as AppStructureContent;

  return (
    <div className="w-full min-w-0 flex-1 space-y-6">
      <FadeIn>
        <div className="flex flex-col justify-between gap-2 border-b border-white/[0.08] pb-3 sm:flex-row sm:items-baseline">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-100">
              App Structure &amp; Architecture Surface
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5 font-medium text-brand-green">
                <Check className="h-3 w-3" strokeWidth={3} />
                {spec.status}
              </span>
              <span className="text-zinc-600">•</span>
              <span>{content.pages.length} routes</span>
              <span className="text-zinc-600">•</span>
              <span>{content.endpoints.length} API endpoints</span>
              <span className="text-zinc-600">•</span>
              <span>{content.components.length} components</span>
            </div>
          </div>
          <div className="rounded-[3px] border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono-tech text-[11px] text-zinc-500">
            v{spec.version}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <SectionCard>
          <SectionHeader
            badge="Pages"
            icon={FileText}
            title="Pages & Routing"
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03] font-mono-tech text-[11px] uppercase text-zinc-400">
                  <th className="w-48 px-4 py-2 font-medium">Route</th>
                  <th className="px-4 py-2 font-medium">Personas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08] text-zinc-300">
                {content.pages.map((page) => (
                  <tr
                    className="h-10 transition-colors hover:bg-white/[0.04]"
                    key={page.route}
                  >
                    <td className="px-4 py-2 font-mono-tech font-medium text-zinc-100">
                      {page.route}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-400">
                      {page.personas.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </FadeIn>

      <FadeIn delay={0.16}>
        <SectionCard>
          <SectionHeader badge="REST" icon={Zap} title="API Endpoints" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03] font-mono-tech text-[11px] uppercase text-zinc-400">
                  <th className="w-24 px-4 py-2 font-medium">Method</th>
                  <th className="w-52 px-4 py-2 font-medium">Path</th>
                  <th className="px-4 py-2 font-medium">Request → Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08] text-zinc-300">
                {content.endpoints.map((endpoint) => (
                  <tr
                    className="h-10 transition-colors hover:bg-white/[0.04]"
                    key={`${endpoint.method}-${endpoint.path}`}
                  >
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          "inline-block rounded-[3px] border px-2 py-0.5 font-mono-tech text-[11px] font-semibold",
                          METHOD_CLASSES[endpoint.method],
                        )}
                      >
                        {endpoint.method}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono-tech text-zinc-100">
                      {endpoint.path}
                    </td>
                    <td className="px-4 py-2 font-mono-tech text-xs text-zinc-400">
                      {endpoint.requestType} → {endpoint.responseType}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </FadeIn>

      <FadeIn delay={0.24}>
        <section className="rounded-lg border border-white/[0.08] bg-brand-surface-muted p-4">
          <div className="flex flex-col justify-between gap-2 border-b border-white/[0.08] pb-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-[15px] w-[15px] text-brand-purple-light" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">
                  Component Architecture
                </h3>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                {content.components.length} components
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2.5 pt-4 sm:grid-cols-2 md:grid-cols-3">
            {content.components.map((component) => (
              <div
                className="flex flex-col gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 transition-colors hover:border-brand-purple/50"
                key={component.name}
              >
                <span className="flex items-center gap-1.5 font-mono-tech text-xs text-zinc-200">
                  <span className="text-[10px] font-bold text-brand-purple">
                    &lt;&gt;
                  </span>
                  {component.name}
                </span>
                <span className="text-[11px] text-zinc-500">
                  {component.responsibility}
                </span>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>
    </div>
  );
}

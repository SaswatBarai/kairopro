"use client";

import { useState } from "react";
import { BadgeCheck, Code, IdCard, Shapes } from "lucide-react";
import type { Spec } from "@kairopro/contracts";

import { FadeIn } from "@/components/landing/fade-in";
import {
  parsePrismaSchema,
  type DataModelContent,
  type ParsedPrismaField,
  type ParsedPrismaModel,
} from "@/lib/spec-content";
import { cn } from "@/lib/utils";

const VIEW_TABS = [
  { id: "visual", label: "Visual Schema" },
  { id: "prisma", label: "Prisma Schema (.prisma)" },
] as const;

function FieldRow({ field }: { field: ParsedPrismaField }) {
  const highlight = field.isId
    ? "rounded-[3px] bg-brand-dark"
    : field.isRelation
      ? "rounded-[3px] bg-brand-dark/60"
      : "";
  return (
    <div
      className={cn("flex items-center justify-between px-2 py-1", highlight)}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            field.isId || field.isRelation ? "bg-brand-purple" : "bg-white/25",
          )}
        />
        <span
          className={cn(
            "text-zinc-100",
            field.isId ? "font-semibold" : field.isRelation && "font-medium",
          )}
        >
          {field.name}
        </span>
        {field.isId && (
          <span className="font-mono-tech text-[10px] font-semibold text-zinc-500">
            PK
          </span>
        )}
        {field.isUnique && !field.isId && (
          <span className="font-mono-tech text-[10px] font-semibold text-brand-green">
            UQ
          </span>
        )}
        {field.isRelation && (
          <span className="font-mono-tech text-[10px] text-brand-purple-light">
            REL
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-right",
          field.isRelation ? "text-brand-purple-light" : "text-zinc-400",
        )}
      >
        {field.type}
      </span>
    </div>
  );
}

function ModelCard({ model }: { model: ParsedPrismaModel }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg bg-brand-surface-muted shadow-sm">
      <div className="flex items-center justify-between bg-white/[0.06] px-3 py-2">
        <div className="flex items-center gap-2">
          <IdCard className="h-[17px] w-[17px] text-brand-purple-light" />
          <span className="font-mono-tech text-[13px] font-semibold text-zinc-100">
            {model.name}
          </span>
        </div>
        <span className="rounded-[3px] bg-brand-surface px-1.5 py-0.5 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-400">
          {model.fields.length} field{model.fields.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 p-3 font-mono-tech text-[11px]">
        {model.fields.map((field) => (
          <FieldRow field={field} key={field.name} />
        ))}
      </div>
    </div>
  );
}

interface SchemaCanvasProps {
  spec: Spec | undefined;
  isLoading: boolean;
}

export function SchemaCanvas({ spec, isLoading }: SchemaCanvasProps) {
  const [activeView, setActiveView] = useState<string>("visual");

  if (!spec) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-lg bg-brand-surface p-10 text-center xl:col-span-8">
        <p className="text-sm text-zinc-400">
          {isLoading
            ? "Generating the data model..."
            : "Waiting for the data model to be generated."}
        </p>
      </div>
    );
  }

  const content = spec.content as unknown as DataModelContent;
  const { models, enums } = parsePrismaSchema(content.schema);

  return (
    <div className="flex flex-col gap-4 xl:col-span-8">
      <FadeIn>
        <div className="flex flex-col justify-between gap-3 rounded-lg bg-brand-surface p-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold tracking-tight text-zinc-100">
                Data Model &amp; Topology
              </span>
              <span className="flex items-center gap-1 rounded-[3px] bg-brand-green/10 px-2 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-green">
                <BadgeCheck className="h-3 w-3" />
                {spec.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 font-mono-tech text-[11px] text-zinc-400">
              <span>Generated from the PRD • v{spec.version}</span>
              <span>•</span>
              <span className="font-medium text-zinc-100">
                {models.length} model{models.length === 1 ? "" : "s"}
              </span>
              <span>•</span>
              <span className="font-medium text-zinc-100">
                {enums.length} enum{enums.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="flex items-center rounded-[3px] bg-brand-dark p-1">
            {VIEW_TABS.map((tab) => (
              <button
                className={cn(
                  "cursor-pointer rounded-[3px] px-3 py-1 font-mono-tech text-[11px] transition-all",
                  activeView === tab.id
                    ? "bg-brand-purple font-semibold text-white"
                    : "text-zinc-400 hover:text-zinc-100",
                )}
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {activeView === "visual" ? (
        <FadeIn delay={0.08}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {models.map((model) => (
              <ModelCard key={model.name} model={model} />
            ))}

            {enums.length > 0 && (
              <div className="flex flex-col overflow-hidden rounded-lg bg-brand-surface-muted shadow-sm md:col-span-2">
                <div className="flex items-center justify-between bg-white/[0.06] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Shapes className="h-[17px] w-[17px] text-brand-purple-light" />
                    <span className="font-mono-tech text-[13px] font-semibold text-zinc-100">
                      Enums
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 p-3 font-mono-tech text-[11px] md:grid-cols-2">
                  {enums.map((enumDef) => (
                    <div
                      className="flex flex-col gap-1 rounded-[3px] bg-brand-dark p-2"
                      key={enumDef.name}
                    >
                      <span className="font-semibold text-brand-purple-light">
                        enum {enumDef.name}
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {enumDef.values.map((value) => (
                          <span
                            className="rounded-[3px] bg-brand-surface-muted px-2 py-0.5 text-[10px] text-zinc-100"
                            key={value}
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FadeIn>
      ) : (
        <FadeIn delay={0.08}>
          <div className="flex flex-col overflow-hidden rounded-lg bg-brand-dark shadow-sm">
            <div className="flex items-center justify-between bg-white/[0.06] px-3 py-2">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-zinc-400" />
                <span className="font-mono-tech text-xs font-semibold text-zinc-100">
                  schema.prisma
                </span>
              </div>
            </div>
            <div className="overflow-x-auto p-3 font-mono-tech text-[11px] leading-relaxed">
              <pre className="whitespace-pre-wrap text-zinc-100">
                {content.schema}
              </pre>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}

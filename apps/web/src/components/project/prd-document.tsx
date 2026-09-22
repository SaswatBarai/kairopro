import { CheckCircle2, Loader2 } from "lucide-react";
import type { Spec } from "@kairopro/contracts";
import type { PrdContent } from "@/lib/spec-content";

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="mb-2 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
      {children}
    </h2>
  );
}

interface PrdDocumentProps {
  spec: Spec | undefined;
  isLoading: boolean;
}

export function PrdDocument({ spec, isLoading }: PrdDocumentProps) {
  if (!spec) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-white/[0.1] bg-brand-surface p-10 text-center shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple-light" />
        <p className="text-sm text-zinc-400">
          {isLoading
            ? "Generating the PRD from your requirements..."
            : "Waiting for the PRD to be generated."}
        </p>
      </div>
    );
  }

  const content = spec.content as unknown as PrdContent;
  const { businessRules } = content;

  return (
    <div className="rounded-lg border border-white/[0.1] bg-brand-surface p-6 shadow-sm">
      <div className="border-b border-white/[0.1] pb-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Product Requirements
          </h1>
          <span className="shrink-0 rounded-[3px] bg-white/[0.06] px-2 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            {spec.status}
          </span>
        </div>
        <p className="font-mono-tech text-[11px] text-zinc-400">
          v{spec.version} • generated from your requirements
        </p>
      </div>

      <section className="mt-6">
        <SectionHeading>01. Overview</SectionHeading>
        <p className="text-sm leading-relaxed text-zinc-400">
          {content.overview}
        </p>
      </section>

      <section className="mt-6 border-t border-white/[0.06] pt-3">
        <SectionHeading>02. Goals</SectionHeading>
        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
          {content.goals.map((goal) => (
            <div
              className="flex items-start gap-2 rounded-[3px] border border-white/[0.06] bg-brand-dark p-2"
              key={goal}
            >
              <CheckCircle2
                className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand-green"
                fill="currentColor"
              />
              <div className="min-w-0 text-[13px] text-zinc-100">{goal}</div>
            </div>
          ))}
        </div>
        {content.nonGoals.length > 0 && (
          <div className="mt-2 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-400">Non-goals: </span>
            {content.nonGoals.join("; ")}
          </div>
        )}
      </section>

      <section className="mt-6 border-t border-white/[0.06] pt-3">
        <SectionHeading>03. Personas</SectionHeading>
        <div className="overflow-x-auto rounded-[3px] border border-white/[0.08]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.06]">
              <tr className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-100">
                <th className="w-40 p-2">Persona</th>
                <th className="p-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {content.personas.map((persona) => (
                <tr
                  className="transition-colors hover:bg-white/[0.03]"
                  key={persona.name}
                >
                  <td className="p-2 font-semibold text-zinc-100">
                    {persona.name}
                  </td>
                  <td className="p-2 text-zinc-400">{persona.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 border-t border-white/[0.06] pt-3">
        <SectionHeading>04. User Stories</SectionHeading>
        <div className="space-y-1">
          {content.userStories.map((story, i) => (
            <div
              className="flex items-start gap-2 rounded-[3px] border border-white/[0.05] bg-brand-dark p-2"
              key={`${story.persona}-${i}`}
            >
              <span className="shrink-0 font-mono-tech text-[10px] font-semibold text-brand-purple-light">
                {story.persona}
              </span>
              <p className="text-xs leading-relaxed text-zinc-400">
                {story.story}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 border-t border-white/[0.06] pt-3">
        <SectionHeading>05. Permission Matrix</SectionHeading>
        <div className="overflow-x-auto rounded-[3px] border border-white/[0.08]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.06]">
              <tr className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-100">
                <th className="w-28 p-2">Role</th>
                <th className="w-40 p-2">Entity</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {businessRules.permissionMatrix.map((rule, i) => (
                <tr
                  className="transition-colors hover:bg-white/[0.03]"
                  key={`${rule.role}-${rule.entity}-${i}`}
                >
                  <td className="p-2 font-semibold text-brand-purple-light">
                    {rule.role}
                  </td>
                  <td className="p-2 text-zinc-100">{rule.entity}</td>
                  <td className="p-2 text-zinc-400">
                    {rule.actions.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 border-t border-white/[0.06] pt-3">
        <SectionHeading>06. Business Rules</SectionHeading>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <p className="mb-1 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
              Invariants
            </p>
            <ul className="list-inside list-disc space-y-1 rounded-[3px] border border-white/[0.06] bg-brand-dark p-2 text-xs leading-relaxed text-zinc-400">
              {businessRules.invariants.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
              Validation
            </p>
            <ul className="list-inside list-disc space-y-1 rounded-[3px] border border-white/[0.06] bg-brand-dark p-2 text-xs leading-relaxed text-zinc-400">
              {businessRules.validationRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
              Money
            </p>
            <ul className="list-inside list-disc space-y-1 rounded-[3px] border border-white/[0.06] bg-brand-dark p-2 text-xs leading-relaxed text-zinc-400">
              {businessRules.moneyRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
              Side effects
            </p>
            <ul className="list-inside list-disc space-y-1 rounded-[3px] border border-white/[0.06] bg-brand-dark p-2 text-xs leading-relaxed text-zinc-400">
              {businessRules.sideEffects.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {content.assumptions.length > 0 && (
        <section className="mt-6 border-t border-white/[0.06] pt-3">
          <div className="mb-2 flex items-center justify-between">
            <SectionHeading>07. Assumptions</SectionHeading>
            <span className="font-mono-tech text-[10px] italic text-zinc-400">
              From unanswered clarification questions
            </span>
          </div>
          <ol className="list-inside list-decimal space-y-1 rounded-[3px] border border-white/[0.06] bg-brand-dark p-3 text-xs leading-relaxed text-zinc-400">
            {content.assumptions.map((a) => (
              <li key={a.questionId}>{a.assumption}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

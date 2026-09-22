"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Loader2,
  Network,
  ShieldCheck,
} from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { NoProjectEmptyState } from "@/components/project/no-project-empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuestionOption {
  value: string;
  label: string;
}

interface Question {
  id: string;
  req: string;
  title: string;
  ariaLabel: string;
  affects: string;
  prd: string;
  icon: LucideIcon;
  options: QuestionOption[];
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    req: "REQ-01",
    title: "1. How should users sign in?",
    ariaLabel: "User sign-in method",
    affects: "affects: auth, schema, env",
    prd: "PRD §2.1",
    icon: Network,
    options: [
      { value: "email", label: "Email and password" },
      { value: "google", label: "Google" },
      { value: "both", label: "Both" },
      { value: "recommend", label: "Recommend one for me" },
    ],
  },
  {
    id: "q2",
    req: "REQ-02",
    title: "2. Does the app need multiple organizations or teams?",
    ariaLabel: "Organization structure",
    affects: "affects: schema, multi-tenancy, middleware",
    prd: "PRD §3.4",
    icon: Building2,
    options: [
      { value: "single", label: "Single user" },
      { value: "team", label: "One team" },
      { value: "multiple", label: "Multiple teams or workspaces" },
      { value: "recommend", label: "Recommend one for me" },
    ],
  },
  {
    id: "q3",
    req: "REQ-03",
    title: "3. What roles exist?",
    ariaLabel: "Role models",
    affects: "affects: rbac, schema, api, ui permissions",
    prd: "PRD §4.0",
    icon: ShieldCheck,
    options: [
      { value: "none", label: "No roles — everyone has full access" },
      { value: "admin_member", label: "Admin and member" },
      { value: "manager", label: "Admin, manager, member" },
      { value: "custom", label: "Custom" },
    ],
  },
  {
    id: "q4",
    req: "REQ-04",
    title: "4. Will this take payments?",
    ariaLabel: "Payment model",
    affects: "affects: stripe sdk, webhook endpoints, billing schema",
    prd: "PRD §5.2",
    icon: CreditCard,
    options: [
      { value: "none", label: "No payments" },
      { value: "stripe", label: "Stripe subscriptions" },
      { value: "unsure", label: "Not sure yet" },
    ],
  },
];

const INITIAL_ANSWERS: Record<string, string> = {
  q1: "both",
  q2: "team",
  q3: "manager",
  q4: "none",
};

export function ClarificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [answers, setAnswers] =
    useState<Record<string, string>>(INITIAL_ANSWERS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!projectId) {
    return <NoProjectEmptyState stepName="project clarification questions" />;
  }

  const specUrl = `/projects/new/spec?projectId=${projectId}`;

  const onSelect = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // The backend doesn't yet have a route to submit these answers (see
  // docs/FRONTEND_INTEGRATION_PLAN.md, gap G1) — every question is always
  // treated as unanswered and becomes an explicit assumption in the PRD
  // instead. Selecting an option here is a preview of what the agent
  // weighs, not something that gets sent anywhere; what's real is kicking
  // off generation itself, which nothing in the app did until now.
  const onContinue = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/specs/generate`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Failed to generate specs");
      }
      router.push(specUrl);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
      setIsGenerating(false);
    }
  };

  return (
    <FadeIn className="flex w-full max-w-[720px] flex-col gap-6">
      <div className="flex w-full items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2 font-mono-tech text-[11px] text-zinc-400">
          <Link
            className="cursor-pointer transition-colors hover:text-zinc-100"
            href="/projects"
          >
            Projects
          </Link>
          <span className="text-zinc-500">/</span>
          <span className="font-mono-tech text-xs text-zinc-100">
            New project
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-[3px] border border-white/[0.06] bg-brand-surface-muted px-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
          <span className="font-mono-tech text-[10px] uppercase tracking-wider text-zinc-400">
            Draft
          </span>
        </div>
      </div>

      <nav aria-label="Setup Pipeline" className="w-full">
        <div className="relative grid w-full grid-cols-3 items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] bg-brand-purple font-mono-tech text-[11px] font-semibold text-white">
              1
            </div>
            <span className="truncate text-sm font-semibold text-zinc-100">
              Questions
            </span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] border border-white/[0.08] bg-white/[0.06] font-mono-tech text-[11px] text-zinc-400">
              2
            </div>
            <span className="truncate text-sm text-zinc-400">Review spec</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] border border-white/[0.08] bg-white/[0.06] font-mono-tech text-[11px] text-zinc-400">
              3
            </div>
            <span className="truncate text-sm text-zinc-400">Build</span>
          </div>
        </div>
        <div className="relative mt-2 h-px w-full overflow-hidden bg-white/[0.08]">
          <div className="absolute left-0 top-0 h-full w-1/3 bg-brand-purple" />
        </div>
      </nav>

      <div className="mt-1 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          A few questions before I plan
        </h1>
        <p className="text-sm text-zinc-400">
          These change the data model and API, so it&apos;s worth getting them
          right.
        </p>
      </div>

      <form
        className="flex flex-col gap-3"
        id="clarification-form"
        onSubmit={(e) => e.preventDefault()}
      >
        {QUESTIONS.map((question) => {
          const selected = answers[question.id];
          return (
            <section
              className="flex flex-col gap-3 rounded-lg border border-white/[0.08] bg-brand-surface-muted p-5 transition-colors hover:border-white/[0.15]"
              key={question.id}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-zinc-100">
                  {question.title}
                </h3>
                <span className="shrink-0 rounded-[3px] border border-white/[0.06] bg-brand-surface px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold tracking-wider text-zinc-500">
                  {question.req}
                </span>
              </div>

              <div
                aria-label={question.ariaLabel}
                className="flex flex-wrap gap-2"
                role="radiogroup"
              >
                {question.options.map((option) => {
                  const isSelected = selected === option.value;
                  return (
                    <button
                      aria-checked={isSelected}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-[3px] border px-3 py-1.5 text-xs transition-all duration-150",
                        isSelected
                          ? "border-brand-purple bg-brand-purple/20 font-medium text-zinc-100"
                          : "border-white/[0.08] bg-white/[0.05] text-zinc-400 hover:border-zinc-500/50 hover:text-zinc-100",
                      )}
                      data-question={question.id}
                      data-val={option.value}
                      key={option.value}
                      role="radio"
                      type="button"
                      onClick={() => onSelect(question.id, option.value)}
                    >
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-brand-purple-light" />
                      )}
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
                <div className="flex items-center gap-1.5 font-mono-tech text-[11px] text-zinc-500">
                  <question.icon className="h-3.5 w-3.5" />
                  <span>{question.affects}</span>
                </div>
                <span className="font-mono-tech text-[10px] text-zinc-500/60">
                  {question.prd}
                </span>
              </div>
            </section>
          );
        })}

        <div className="flex flex-col items-center gap-2 pt-3">
          <p className="text-center text-xs text-zinc-500">
            These choices aren&apos;t saved yet — unanswered questions become
            assumptions you can edit in the PRD.
          </p>
          {error && (
            <div
              className="flex w-full items-center gap-2 rounded-[3px] border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              className="h-10 w-full gap-2 px-6 sm:w-auto"
              disabled={isGenerating}
              type="button"
              onClick={() => void onContinue()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating spec...</span>
                </>
              ) : (
                <>
                  <span>Continue to spec</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </FadeIn>
  );
}

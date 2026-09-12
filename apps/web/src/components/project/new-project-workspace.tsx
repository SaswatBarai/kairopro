"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
  FileUp,
  Info,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    id: "task-manager",
    label: "Task manager",
    text: "A task management app for small teams. Projects, tasks with priority and due dates, comments, and an admin role that can manage members.",
  },
  {
    id: "crm",
    label: "CRM",
    text: "Customer relationship management tool. Pipeline stages, lead assignment, activity timeline, contact sync, and automated deal status transition webhooks.",
  },
  {
    id: "booking",
    label: "Booking system",
    text: "Appointment booking system. Calendar availability schedules, client intake custom fields, automated confirmation emails, and Stripe deposit checkout.",
  },
  {
    id: "dashboard",
    label: "Internal dashboard",
    text: "Internal metric analytics dashboard. Role-based data access, real-time telemetry charts, audit logs, and scheduled report export triggers.",
  },
];

const DEFAULT_REQUIREMENTS = TEMPLATES[0]?.text ?? "";

interface AttachedFile {
  name: string;
  sizeKb: number;
}

const INITIAL_FILE: AttachedFile = {
  name: "product-requirements.pdf",
  sizeKb: 482,
};

function formatSizeKb(bytes: number): number {
  return Math.max(1, Math.round(bytes / 1024));
}

export function NewProjectWorkspace() {
  const [requirements, setRequirements] = useState(DEFAULT_REQUIREMENTS);
  const [file, setFile] = useState<AttachedFile | null>(INITIAL_FILE);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = requirements.trim().length;
  const readyCount = (charCount > 0 ? 1 : 0) + (file ? 1 : 0);

  const onTemplateClick = (text: string) => {
    setRequirements(text);
    textareaRef.current?.focus();
  };

  const onFileSelected = (selected: File | undefined) => {
    if (!selected) return;
    setFile({ name: selected.name, sizeKb: formatSizeKb(selected.size) });
  };

  const onRemoveFile = () => setFile(null);

  return (
    <FadeIn className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <section className="flex flex-col gap-4 lg:col-span-7">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Tell us what to build
          </h1>
          <p className="text-sm text-zinc-400">
            Describe the app, or upload what you already have.
          </p>
        </header>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label
              className="text-sm font-semibold text-zinc-100"
              htmlFor="app-requirements"
            >
              Application requirements
            </label>
            <span
              aria-live="polite"
              className="font-mono-tech text-[10px] font-medium uppercase tracking-wider text-zinc-500"
              id="char-counter"
            >
              {charCount} chars
            </span>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-brand-dark p-1 shadow-sm transition-colors duration-150 focus-within:border-white/[0.15] focus-within:bg-brand-surface">
            <Textarea
              className="min-h-[196px] resize-y rounded-none border-0 bg-transparent p-2 text-sm leading-relaxed text-zinc-100 shadow-none outline-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
              id="app-requirements"
              placeholder="Describe your workflows, user archetypes, core logic, or data primitives in natural language..."
              ref={textareaRef}
              rows={9}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="shrink-0 text-xs text-zinc-400">
            Or start from a template:
          </span>
          <div className="flex flex-wrap gap-1">
            {TEMPLATES.map((template) => (
              <button
                className="cursor-pointer rounded-[3px] bg-brand-surface-muted px-2 py-[5px] text-xs text-zinc-100 transition-colors hover:bg-white/[0.08]"
                key={template.id}
                type="button"
                onClick={() => onTemplateClick(template.text)}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-100">
              Attachments
            </span>
            <span className="font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
              {file ? 1 : 0} / 5 uploaded
            </span>
          </div>

          <div
            className={cn(
              "group flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/[0.12] bg-brand-dark px-6 py-8 transition-colors duration-150 hover:bg-brand-surface",
              dragging && "border-white/25 bg-white/[0.04]",
            )}
            id="drop-zone"
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onDragLeave={() => setDragging(false)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onFileSelected(e.dataTransfer.files?.[0]);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-surface-muted text-zinc-400 transition-colors group-hover:text-brand-purple-light">
              <FileUp className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="font-semibold text-brand-purple-light">
                Browse files
              </span>
              <span className="text-zinc-400">or drag and drop here</span>
            </div>
            <p className="text-center font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
              PDF, DOCX, TXT, MD, PNG, JPG, SVG — up to 10MB each, 5 files
              maximum
            </p>
            <input
              accept=".pdf,.docx,.txt,.md,.png,.jpg,.svg"
              className="hidden"
              id="file-input"
              multiple
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                onFileSelected(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          {file && (
            <div
              className="flex items-center justify-between rounded-[3px] bg-brand-surface-muted px-3 py-2 transition-colors"
              id="attachment-item"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] bg-rose-400/10 text-rose-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-mono-tech text-xs font-medium text-zinc-100">
                    {file.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
                    <span>{file.sizeKb} KB</span>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span className="flex items-center gap-1 text-brand-green">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </span>
                  </div>
                </div>
              </div>
              <button
                className="cursor-pointer rounded-[3px] p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-rose-400"
                id="remove-file-btn"
                title="Remove attachment"
                type="button"
                onClick={onRemoveFile}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse items-center justify-between gap-3 pt-3 sm:flex-row">
          <div className="flex items-center gap-1.5 font-mono-tech text-[11px] text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-brand-green" />
            <span>Saved as draft 1m ago</span>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              asChild
              className="h-10 w-full gap-2 px-6 sm:w-auto"
              id="generate-prd-btn"
            >
              <a href="/projects/new/questions">
                <span>Generate PRD</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <aside className="sticky top-[92px] flex flex-col gap-3 lg:col-span-5">
        <Card className="gap-4 rounded-lg border-white/[0.08] bg-brand-surface p-4 shadow-lg">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-brand-purple-light" />
              <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
                Project summary
              </h2>
            </div>
            <Badge
              className="tracking-wide"
              id="readiness-badge"
              mono
              variant="secondary"
            >
              {readyCount} / 4 inputs ready
            </Badge>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-2 rounded-[3px] bg-brand-dark p-2">
              {charCount > 0 ? (
                <CheckCircle2 className="mt-px h-[18px] w-[18px] shrink-0 text-brand-green" />
              ) : (
                <Circle className="mt-px h-[18px] w-[18px] shrink-0 text-zinc-500" />
              )}
              <div className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold leading-[18px] text-zinc-100">
                  Requirements text
                </span>
                <span
                  className="font-mono-tech text-[11px] text-zinc-500"
                  id="summary-req-meta"
                >
                  {charCount > 0
                    ? `Defined (${charCount} characters)`
                    : "Empty (required)"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-[3px] bg-brand-dark p-2">
              {file ? (
                <CheckCircle2 className="mt-px h-[18px] w-[18px] shrink-0 text-brand-green" />
              ) : (
                <Circle className="mt-px h-[18px] w-[18px] shrink-0 text-zinc-500" />
              )}
              <div className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold leading-[18px] text-zinc-100">
                  Attachments
                </span>
                <span
                  className="truncate font-mono-tech text-[11px] text-zinc-500"
                  id="summary-attachment-meta"
                >
                  {file ? `1 file (${file.name})` : "None attached"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-[3px] bg-brand-dark p-2">
              <Circle className="mt-px h-[18px] w-[18px] shrink-0 text-zinc-500" />
              <div className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold leading-[18px] text-zinc-100">
                  Reference site
                </span>
                <span className="font-mono-tech text-[11px] text-zinc-500">
                  Not yet provided
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-[3px] bg-brand-dark p-2">
              <Circle className="mt-px h-[18px] w-[18px] shrink-0 text-zinc-500" />
              <div className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold leading-[18px] text-zinc-100">
                  Design direction
                </span>
                <span className="font-mono-tech text-[11px] text-zinc-500">
                  Default: Clean SaaS
                </span>
              </div>
            </div>
          </div>

          <Separator className="bg-white/[0.08]" />

          <div className="flex flex-col gap-1 rounded-[3px] bg-brand-surface-muted p-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
              <Info className="h-4 w-4 shrink-0 text-brand-purple-light" />
              <span>Next: three short questions about your app</span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              You&apos;ll confirm authentication, multi-tenancy, roles, and
              billing before specification generation.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 rounded-[3px] bg-brand-dark p-3 font-mono-tech text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">TARGET_RUNTIME:</span>
              <span className="font-medium text-zinc-100">
                Next.js 15 App Router
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">DATABASE:</span>
              <span className="font-medium text-zinc-100">
                PostgreSQL + Prisma ORM
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">ENVIRONMENT:</span>
              <span className="font-medium text-zinc-100">
                Isolated Micro-VM
              </span>
            </div>
          </div>
        </Card>
      </aside>
    </FadeIn>
  );
}

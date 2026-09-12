"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Code,
  IdCard,
  ListChecks,
  MessageSquare,
  Shapes,
  ShieldCheck,
} from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { cn } from "@/lib/utils";

type TagTone = "pk" | "uq" | "fk";
type TypeTone = "muted" | "purple" | "green" | "white";
type DotTone = "pk" | "scalar" | "fk";

interface Field {
  name: string;
  tag?: TagTone;
  type: string;
  typeTone?: TypeTone;
  dot: DotTone;
  highlight?: "pk" | "fk";
  strong?: boolean;
}

interface Relation {
  name: string;
  card: string;
  tone?: "purple" | "green";
}

interface Column {
  fields: Field[];
  inlineRelations?: Relation[];
}

interface ModelCardData {
  id: string;
  name: string;
  icon: LucideIcon;
  note?: string;
  softBadge?: string;
  solidBadge?: string;
  headerMeta?: string;
  fields?: Field[];
  relations?: Relation[];
  columns?: Column[];
  wide?: boolean;
}

const MODELS: ModelCardData[] = [
  {
    id: "user",
    name: "User",
    icon: IdCard,
    note: "core entity",
    fields: [
      {
        name: "id",
        tag: "pk",
        type: "String (cuid)",
        dot: "pk",
        highlight: "pk",
        strong: true,
      },
      { name: "email", tag: "uq", type: "String", dot: "scalar" },
      { name: "name", type: "String?", dot: "scalar" },
      {
        name: "role",
        type: "UserRole (DEFAULT: MEMBER)",
        dot: "scalar",
        typeTone: "purple",
      },
      { name: "createdAt", type: "DateTime (@now)", dot: "scalar" },
    ],
    relations: [
      { name: "tasks", card: "1:N → Task[]" },
      { name: "comments", card: "1:N → Comment[]" },
    ],
  },
  {
    id: "workspace",
    name: "Workspace",
    icon: Building2,
    note: "multi-tenant",
    fields: [
      {
        name: "id",
        tag: "pk",
        type: "String (cuid)",
        dot: "pk",
        highlight: "pk",
        strong: true,
      },
      { name: "name", type: "String", dot: "scalar" },
      { name: "slug", tag: "uq", type: "String", dot: "scalar" },
      { name: "createdAt", type: "DateTime", dot: "scalar" },
    ],
    relations: [
      { name: "members", card: "N:M → User[]" },
      { name: "tasks", card: "1:N → Task[]" },
    ],
  },
  {
    id: "task",
    name: "Task",
    icon: ListChecks,
    softBadge: "Anchor Node",
    headerMeta: "Indexes: authorId, assigneeId, workspaceId",
    wide: true,
    columns: [
      {
        fields: [
          {
            name: "id",
            tag: "pk",
            type: "String (cuid)",
            dot: "pk",
            highlight: "pk",
            strong: true,
          },
          { name: "title", type: "String", dot: "scalar" },
          { name: "description", type: "String?", dot: "scalar" },
          {
            name: "priority",
            type: "Priority (HIGH, MED, LOW)",
            dot: "scalar",
            typeTone: "white",
          },
          {
            name: "status",
            type: "TaskStatus (DEFAULT: TODO)",
            dot: "scalar",
            typeTone: "purple",
          },
        ],
      },
      {
        fields: [
          {
            name: "authorId",
            tag: "fk",
            type: "String → User.id",
            dot: "fk",
            highlight: "fk",
            strong: true,
          },
          {
            name: "assigneeId",
            tag: "fk",
            type: "String? → User.id (SetNull)",
            dot: "fk",
            highlight: "fk",
            strong: true,
            typeTone: "purple",
          },
          {
            name: "workspaceId",
            tag: "fk",
            type: "String → Workspace.id",
            dot: "fk",
            highlight: "fk",
            strong: true,
          },
        ],
        inlineRelations: [
          {
            name: "subtasks",
            card: "1:N → Subtask[] (Cascade)",
            tone: "green",
          },
          { name: "comments", card: "1:N → Comment[]", tone: "purple" },
        ],
      },
    ],
  },
  {
    id: "subtask",
    name: "Subtask",
    icon: ListChecks,
    solidBadge: "NEW (from agent feedback)",
    fields: [
      {
        name: "id",
        tag: "pk",
        type: "String (cuid)",
        dot: "pk",
        highlight: "pk",
        strong: true,
      },
      { name: "title", type: "String", dot: "scalar" },
      { name: "completed", type: "Boolean (default: false)", dot: "scalar" },
      {
        name: "taskId",
        tag: "fk",
        type: "Task.id (Cascade)",
        dot: "fk",
        highlight: "fk",
        strong: true,
        typeTone: "purple",
      },
    ],
  },
  {
    id: "comment",
    name: "Comment",
    icon: MessageSquare,
    note: "discussion",
    fields: [
      {
        name: "id",
        tag: "pk",
        type: "String (cuid)",
        dot: "pk",
        highlight: "pk",
        strong: true,
      },
      { name: "body", type: "String (text)", dot: "scalar" },
      {
        name: "taskId",
        tag: "fk",
        type: "String → Task.id",
        dot: "fk",
        highlight: "fk",
        strong: true,
      },
      {
        name: "authorId",
        tag: "fk",
        type: "String → User.id",
        dot: "fk",
        highlight: "fk",
        strong: true,
      },
      { name: "createdAt", type: "DateTime (@now)", dot: "scalar" },
    ],
  },
];

const ENUMS = [
  {
    name: "enum UserRole",
    values: [
      { label: "ADMIN", isDefault: false },
      { label: "MANAGER", isDefault: false },
      { label: "MEMBER (default)", isDefault: true },
    ],
  },
  {
    name: "enum TaskStatus",
    values: [
      { label: "BACKLOG", isDefault: false },
      { label: "TODO (default)", isDefault: true },
      { label: "IN_PROGRESS", isDefault: false },
      { label: "IN_REVIEW", isDefault: false },
      { label: "DONE", isDefault: false },
    ],
  },
];

const VIEW_TABS = [
  { id: "visual", label: "Visual Schema" },
  { id: "prisma", label: "Prisma Schema (.prisma)" },
  { id: "sql", label: "SQL Migration" },
] as const;

const DOT_CLASSES: Record<DotTone, string> = {
  pk: "bg-brand-purple",
  scalar: "bg-white/25",
  fk: "bg-brand-purple",
};

const TAG_CLASSES: Record<TagTone, string> = {
  pk: "font-semibold text-zinc-500",
  uq: "font-semibold text-brand-green",
  fk: "text-brand-purple-light",
};

function typeClasses(tone: TypeTone | undefined): string {
  switch (tone) {
    case "purple":
      return "text-brand-purple-light";
    case "green":
      return "text-brand-green";
    case "white":
      return "font-medium text-zinc-100";
    default:
      return "text-zinc-400";
  }
}

function FieldRow({ field }: { field: Field }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-1",
        field.highlight === "pk" && "rounded-[3px] bg-brand-dark",
        field.highlight === "fk" && "rounded-[3px] bg-brand-dark/60",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[field.dot])}
        />
        <span
          className={cn(
            "text-zinc-100",
            field.strong &&
              (field.tag === "pk" ? "font-semibold" : "font-medium"),
          )}
        >
          {field.name}
        </span>
        {field.tag && (
          <span
            className={cn("font-mono-tech text-[10px]", TAG_CLASSES[field.tag])}
          >
            {field.tag.toUpperCase()}
          </span>
        )}
      </div>
      <span className={cn("text-right", typeClasses(field.typeTone))}>
        {field.type}
      </span>
    </div>
  );
}

function InlineRelationRow({ relation }: { relation: Relation }) {
  return (
    <div className="flex items-center justify-between px-2 py-1">
      <span className="flex items-center gap-1 text-zinc-400">
        <ArrowUpRight className="h-3 w-3 text-brand-purple-light" />
        {relation.name}
      </span>
      <span
        className={cn(
          "font-mono-tech text-[10px]",
          relation.tone === "green"
            ? "text-brand-green"
            : "text-brand-purple-light",
        )}
      >
        {relation.card}
      </span>
    </div>
  );
}

function ModelCard({ model }: { model: ModelCardData }) {
  const Icon = model.icon;
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg bg-brand-surface-muted shadow-sm",
        model.wide && "md:col-span-2",
      )}
    >
      <div className="flex items-center justify-between bg-white/[0.06] px-3 py-2">
        <div className="flex items-center gap-2">
          <Icon className="h-[17px] w-[17px] text-brand-purple-light" />
          <span className="font-mono-tech text-[13px] font-semibold text-zinc-100">
            {model.name}
          </span>
          {model.softBadge && (
            <span className="rounded-[3px] bg-brand-purple/10 px-2 py-0.5 font-mono-tech text-[10px] uppercase tracking-wider text-brand-purple-light">
              {model.softBadge}
            </span>
          )}
          {model.solidBadge && (
            <span className="rounded-[3px] bg-brand-purple px-2 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-white">
              {model.solidBadge}
            </span>
          )}
        </div>
        {model.headerMeta ? (
          <div className="flex items-center gap-2">
            <span className="font-mono-tech text-[10px] text-zinc-400">
              {model.headerMeta}
            </span>
          </div>
        ) : (
          model.note && (
            <span className="rounded-[3px] bg-brand-surface px-1.5 py-0.5 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-400">
              {model.note}
            </span>
          )
        )}
      </div>

      <div className="flex flex-col gap-1.5 p-3 font-mono-tech text-[11px]">
        {model.fields &&
          model.fields.map((field) => (
            <FieldRow field={field} key={field.name} />
          ))}

        {model.columns && (
          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 md:grid-cols-2">
            {model.columns.map((column, index) => (
              <div className="flex flex-col gap-1.5" key={index}>
                {column.fields.map((field) => (
                  <FieldRow field={field} key={field.name} />
                ))}
                {column.inlineRelations?.map((relation) => (
                  <InlineRelationRow relation={relation} key={relation.name} />
                ))}
              </div>
            ))}
          </div>
        )}

        {model.relations && (
          <div className="mt-2 flex flex-col gap-1 rounded-[3px] bg-brand-dark/50 p-2">
            {model.relations.map((relation) => (
              <div
                className="flex items-center justify-between"
                key={relation.name}
              >
                <span className="flex items-center gap-1 text-zinc-400">
                  <ArrowUpRight className="h-3 w-3 text-brand-purple-light" />
                  {relation.name}
                </span>
                <span className="font-mono-tech text-[10px] text-brand-purple-light">
                  {relation.card}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SchemaCanvas() {
  const [activeView, setActiveView] = useState<string>("visual");

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
                Ready for DDL emit
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 font-mono-tech text-[11px] text-zinc-400">
              <span>PostgreSQL schema generated from PRD-001</span>
              <span>•</span>
              <span>Prisma v5.12</span>
              <span>•</span>
              <span className="font-medium text-zinc-100">6 models</span>
              <span>•</span>
              <span className="font-medium text-zinc-100">2 enums</span>
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

      <FadeIn delay={0.08}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {MODELS.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}

          <div className="flex flex-col overflow-hidden rounded-lg bg-brand-surface-muted shadow-sm md:col-span-2">
            <div className="flex items-center justify-between bg-white/[0.06] px-3 py-2">
              <div className="flex items-center gap-2">
                <Shapes className="h-[17px] w-[17px] text-brand-purple-light" />
                <span className="font-mono-tech text-[13px] font-semibold text-zinc-100">
                  Postgres Enums
                </span>
              </div>
              <span className="font-mono-tech text-[10px] uppercase tracking-wider text-zinc-400">
                native DB enums
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 p-3 font-mono-tech text-[11px] md:grid-cols-2">
              {ENUMS.map((enumDef) => (
                <div
                  className="flex flex-col gap-1 rounded-[3px] bg-brand-dark p-2"
                  key={enumDef.name}
                >
                  <span className="font-semibold text-brand-purple-light">
                    {enumDef.name}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {enumDef.values.map((value) => (
                      <span
                        className={cn(
                          "rounded-[3px] bg-brand-surface-muted px-2 py-0.5 text-[10px] text-zinc-100",
                          value.isDefault && "font-semibold",
                        )}
                        key={value.label}
                      >
                        {value.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.16}>
        <div className="flex flex-col overflow-hidden rounded-lg bg-brand-dark shadow-sm">
          <div className="flex items-center justify-between bg-white/[0.06] px-3 py-2">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-zinc-400" />
              <span className="font-mono-tech text-xs font-semibold text-zinc-100">
                schema.prisma
              </span>
              <span className="font-mono-tech text-[10px] text-zinc-500">
                • Focused diff snippet
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-[3px] bg-brand-green/10 px-2 py-0.5 font-mono-tech text-[10px] text-brand-green">
              <ShieldCheck className="h-3 w-3" />
              <span className="hidden md:inline">
                Prisma Schema Validated • Zero circular dependencies • Relations
                indexed
              </span>
              <span className="md:hidden">Schema validated</span>
            </div>
          </div>
          <div className="overflow-x-auto p-3 font-mono-tech text-[11px] leading-relaxed">
            <pre className="text-zinc-100">
              <span className="font-semibold text-brand-purple-light">
                model
              </span>{" "}
              <span className="font-bold text-zinc-100">Subtask</span> {"{"}
              {"\n"} <span className="text-zinc-100">id</span>
              {"        "}
              <span className="text-brand-purple-light">String</span>
              {"   "}
              <span className="text-zinc-500">@id @default(cuid())</span>
              {"\n"} <span className="text-zinc-100">title</span>
              {"     "}
              <span className="text-brand-purple-light">String</span>
              {"\n"} <span className="text-zinc-100">completed</span>{" "}
              <span className="text-brand-purple-light">Boolean</span>
              {"  "}
              <span className="text-zinc-500">@default(false)</span>
              {"\n"} <span className="text-zinc-100">taskId</span>
              {"    "}
              <span className="text-brand-purple-light">String</span>
              {"\n"} <span className="text-zinc-100">task</span>
              {"      "}
              <span className="text-brand-purple-light">Task</span>
              {"     "}
              <span className="text-zinc-500">
                @relation(fields: [taskId], references: [id], onDelete: Cascade)
              </span>
              {"\n"} <span className="text-zinc-100">createdAt</span>{" "}
              <span className="text-brand-purple-light">DateTime</span>{" "}
              <span className="text-zinc-500">@default(now())</span>
              {"\n\n"}{" "}
              <span className="font-medium text-brand-purple">
                @@index([taskId])
              </span>
              {"\n"}
              {"}"}
            </pre>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

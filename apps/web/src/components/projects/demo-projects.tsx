import {
  CalendarClock,
  FileText,
  Layers,
  LayoutDashboard,
  ReceiptText,
} from "lucide-react";

import type { Project } from "./project-card";
import {
  BuildingPreview,
  DraftPreview,
  InvoicePreview,
  KanbanPreview,
} from "./project-previews";

export const SEED_PROJECTS: Project[] = [
  {
    name: "TaskFlow",
    icon: Layers,
    iconClass: "text-brand-purple-light",
    status: "deployed",
    bucket: "active",
    preview: <KanbanPreview />,
    activityValue: "Deployed 2 days ago",
    url: { display: "taskflow.kairopro.app", full: "taskflow.kairopro.app" },
    stack: "Next.js 15 • PostgreSQL",
    footerRef: "main @ 7e2f1a",
  },
  {
    name: "Invoice CRM",
    icon: ReceiptText,
    iconClass: "text-brand-purple-light",
    status: "ready",
    bucket: "active",
    preview: <InvoicePreview />,
    activityValue: "Built 4 hours ago",
    url: {
      display: "invoice-crm-a1b2.preview...",
      full: "invoice-crm-a1b2.preview.kairo.dev",
    },
    stack: "Next.js 15 • Prisma",
    footerRef: "preview @ pr-14",
  },
  {
    name: "Booking System",
    icon: CalendarClock,
    iconClass: "text-brand-cyan",
    status: "building",
    bucket: "building",
    preview: <BuildingPreview />,
    activityValue: "Started 1 minute ago",
    agentStep: "Step 3/7: Creating API routes",
    worker: "agent-runner-x86-04",
    footerRef: "agent-runner-x86-04",
  },
  {
    name: "Internal Dashboard",
    icon: LayoutDashboard,
    iconClass: "text-zinc-500",
    status: "draft",
    bucket: "draft",
    preview: <DraftPreview />,
    activityValue: "Spec approved 3 days ago",
    architect: "alex.w@internal.io",
    stack: "Next.js 15 • Tailwind",
    footerRef: "draft-v1.yaml",
  },
];

export function createProjectFromSpec(name: string): Project {
  return {
    name: name.trim() || "untitled-project",
    icon: FileText,
    iconClass: "text-brand-cyan",
    status: "building",
    bucket: "building",
    preview: <BuildingPreview />,
    activityValue: "Started just now",
    agentStep: "Step 1/7: Understanding requirements",
    worker: "agent-runner-x86-01",
    footerRef: "agent-runner-x86-01",
  };
}

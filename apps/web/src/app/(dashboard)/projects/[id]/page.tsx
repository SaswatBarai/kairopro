import type { Metadata } from "next";
import { getProject } from "@kairopro/core";
import type { Project } from "@kairopro/contracts";

import { WorkspacePage } from "@/components/workspace/workspace-page";
import { getRequestContext } from "@/lib/request-context";

type RouteParams = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { id } = await params;
  const ctx = await getRequestContext().catch(() => null);
  const project = ctx ? await getProject(id, ctx).catch(() => null) : null;

  return {
    title: project
      ? `${project.name} — Workspace — KairoPro`
      : "Workspace — KairoPro",
    description:
      "KairoPro developer workspace — code editor, file explorer, agent workbench, and runtime diagnostics.",
  };
}

export default async function ProjectWorkspaceRoute({ params }: RouteParams) {
  const { id } = await params;
  const ctx = await getRequestContext().catch(() => null);
  const initialProject: Project | null = ctx
    ? await getProject(id, ctx).catch(() => null)
    : null;

  return <WorkspacePage projectId={id} initialProject={initialProject} />;
}

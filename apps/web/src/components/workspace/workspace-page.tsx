import type { Project } from "@kairopro/contracts";

import { WorkspaceApp } from "@/components/workspace/workspace-app";

interface WorkspacePageProps {
  projectId: string;
  initialProject: Project | null;
}

export function WorkspacePage({
  projectId,
  initialProject,
}: WorkspacePageProps) {
  return <WorkspaceApp projectId={projectId} initialProject={initialProject} />;
}
